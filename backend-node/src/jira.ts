import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import type { DateCodec } from './dates.js';
import { parseDate } from './dates.js';
import type { JiraWorkLogsStore } from './features/jira-work-logs/jira-work-logs.types.js';
import type { JiraSearchResult, JiraTransport } from './features/jira/jira.types.js';
import type { TasksStore } from './features/tasks/tasks.types.js';
import type { TimersStore } from './features/timers/timers.types.js';
import { ApiError, capture, envelope, queryParams } from './http.js';
import { uuid } from './http/http.constants.js';
import type { Route } from './http/http.types.js';
import { boolean, JiraError, record } from './jira-client.js';
import type { TasksService } from './tasks.js';
import type { TimezoneProvider } from './time/time.types.js';

export class JiraService {
  constructor(private readonly tasks: Pick<TasksService, 'get'>, private readonly taskRepository: Pick<TasksStore, 'names'>,
    private readonly timers: Pick<TimersStore, 'forTask'>, private readonly logs: Pick<JiraWorkLogsStore, 'forDate' | 'saveRemote'>,
    private readonly timezone: TimezoneProvider, private readonly dates: DateCodec, private readonly client: JiraTransport) { }

  async sync(id: string, date: string): Promise<void> {
    const task = await this.tasks.get(id);
    const zone = await this.timezone.userTimezone();
    const day = parseDate(date, zone)!.startOf('day');
    const end = day.endOf('day').startOf('second');
    const canonical = day.toISODate();
    const existing = await this.logs.forDate(id, canonical);
    const timers = await this.timers.forTask(id);
    let seconds = 0;
    let descriptions = [];
    for (const timer of timers) {
      const start = this.dates.storedDate(timer.start_time);
      const finish = timer.end_time ? this.dates.storedDate(timer.end_time) : end;
      if (+start > +end || +finish < +day) continue;
      seconds += Math.max(0, Math.floor(Math.min(+finish, +end) / 1000) - Math.floor(Math.max(+start, +day) / 1000));
      if (timer.description && timer.description !== '0') descriptions.push(timer.description);
    }
    const pieces = task.name.split('-#-');
    if (pieces.length > 1) descriptions = [(pieces[1] ?? '').trim()];
    let remote;
    try {
      const request = await this.client.session();
      if (seconds < 60) throw new JiraError('Cannot report less than 60 second!');
      const payload = { id: null, self: null, author: null, updateAuthor: null, updated: null, timeSpent: null, comment: descriptions.join(', '), started: day.set({ hour: 17 }).toFormat("yyyy-MM-dd'T'HH:mm:ss'.000'ZZZ"), timeSpentSeconds: seconds, visibility: null };
      const path = `/issue/${(pieces[0] ?? '').trim()}/worklog`;
      if (existing?.work_log_id && existing.work_log_id !== '0') {
        try { remote = await request(`${path}/${parseInt(existing.work_log_id, 10) || 0}`, payload, 'PUT'); }
        catch (error) { if (!(error instanceof JiraError)) throw error; }
      }
      remote ??= await request(path, payload);
    } catch (error) {
      if (error instanceof JiraError) throw new ApiError(409, ['Problems syncing with JIRA!', error.message]);
      throw error;
    }
    // Remote success is deliberately not compensated if the following local write fails.
    await this.logs.saveRemote({ id: existing?.id ?? randomUUID(), taskId: id, remoteId: String(remote.id ?? ''), seconds, date: canonical }, Boolean(existing));
  }

  async missing(query: URLSearchParams): Promise<JiraSearchResult> {
    const fields = ['assignedToMe', 'reportedByMe', 'resolution', 'projects', 'limit'];
    for (const key of query.keys()) if (fields.some(field => key.startsWith(field + '['))) throw new ApiError(400, ['Bad Request']);
    const flag = (key: string, fallback: string) => {
      const value = (query.get(key) ?? fallback).trim();
      if (!/^(1|0|true|false|yes|no|on|off|)$/i.test(value)) throw new ApiError(400, ['Bad Request']);
      return boolean(value);
    };
    const assigned = flag('assignedToMe', 'true');
    const reported = flag('reportedByMe', 'false');
    const limitInput = (query.get('limit') ?? '50').trim();
    if (!/^[+-]?(0|[1-9]\d*)$/.test(limitInput) || !Number.isSafeInteger(Number(limitInput))) throw new ApiError(400, ['Bad Request']);
    const limit = Math.max(50, Math.min(200, Number(limitInput)));
    const resolution = (query.get('resolution') ?? 'unresolved').trim().toLowerCase();
    const projects = (query.get('projects') ?? '').trim();
    const errors: Record<string, string> = {};
    if (!['all', 'unresolved', 'resolved'].includes(resolution)) errors.resolution = 'The value you selected is not a valid choice.';
    if (projects && !/^[A-Z][A-Z0-9_]{1,9}(?:\s*,\s*[A-Z][A-Z0-9_]{1,9})*$/i.test(projects)) errors.projects = 'Project keys must be comma-separated Jira project keys.';
    if (!assigned && !reported && resolution === 'all' && !projects) errors.criteria = 'Select at least one Jira search criterion.';
    if (Object.keys(errors).length) throw new ApiError(406, errors);
    const clauses = [];
    const users = [assigned ? 'assignee = currentUser()' : '', reported ? 'reporter = currentUser()' : ''].filter(Boolean);
    if (users.length) clauses.push(users.length > 1 ? `(${users.join(' OR ')})` : users[0]);
    if (resolution !== 'all') clauses.push(`resolution IS ${resolution === 'resolved' ? 'NOT ' : ''}EMPTY`);
    if (projects) clauses.push(`project IN (${[...new Set(projects.toUpperCase().split(',').map(key => key.trim()))].map(key => `"${key}"`).join(', ')})`);
    const jql = clauses.join(' AND ') + ' ORDER BY updated DESC';
    const known = new Set((await this.taskRepository.names()).map(name => (name.split('-#-')[0] ?? '').trim().toUpperCase()).filter(key => /^[A-Z][A-Z0-9_]*-\d+$/.test(key)));
    const result = [];
    try {
      const request = await this.client.session();
      let enhanced = false;
      let startAt = 0;
      let nextPageToken: unknown = '';
      for (; ;) {
        let page;
        const common = { jql, maxResults: limit, fields: ['summary', 'status', 'issuetype', 'updated'] };
        try { page = await request(enhanced ? '/search/jql' : '/search', enhanced ? { ...common, expand: '', reconcileIssues: [], ...(nextPageToken ? { nextPageToken } : {}) } : { ...common, startAt }); }
        catch (error) {
          if (!enhanced && error instanceof JiraError && [404, 405, 410].includes(error.status)) { enhanced = true; continue; }
          throw error;
        }
        const issues = Array.isArray(page.issues) ? page.issues : [];
        for (const issue of issues) {
          if (!issue || typeof issue !== 'object') continue;
          const key = String(record(issue).key ?? '');
          const normalized = key.trim().toUpperCase();
          if (!normalized || known.has(normalized)) continue;
          known.add(normalized);
          const f = record(record(issue).fields);
          const updated = typeof f.updated === 'string' ? DateTime.fromISO(f.updated, { setZone: true }) : null;
          result.push({ key, summary: String(f.summary ?? ''), status: String(record(f.status).name ?? ''), issueType: String(record(f.issuetype).name ?? ''), updated: updated?.isValid ? updated.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ") : null });
          if (result.length > limit) return { issues: result.slice(0, limit), meta: { limit, truncated: true } };
        }
        if (enhanced) { nextPageToken = page.nextPageToken ?? ''; if (!nextPageToken) break; }
        else { startAt += issues.length; if (!issues.length || !Number.isInteger(page.total) || startAt >= Number(page.total)) break; }
      }
    } catch (error) {
      if (!(error instanceof JiraError)) throw error;
      throw new ApiError(502, ['Unable to search Jira.']);
    }
    return { issues: result, meta: { limit, truncated: false } };
  }
}

export class JiraController {
  constructor(private readonly service: JiraService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/task\/jira\/missing$/, methods: {
          GET: async request => {
            const result = await this.service.missing(queryParams(request.url));
            return envelope(result.issues, undefined, result.meta);
          }
        }
      },
      {
        path: new RegExp(`^/api/task/(${uuid})/([0-9]{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|(?<!02-)3[01]))$`), methods: {
          POST: async (_request, reply, match) => { await this.service.sync(capture(match, 1), capture(match, 2)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
