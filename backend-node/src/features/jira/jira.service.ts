import { randomUUID } from 'node:crypto';

import { DateTime }   from 'luxon';

import type { JiraWorkLogRow, TaskRow, TimerRow } from '@database/records.types';

import type {
  JiraSearchRequest,
  JiraSearchResult,
  JiraSession,
  JiraTransport,
  JiraWorkLogPayload
}                            from '@features/jira/jira.types';
import { JiraError }                              from '@features/jira/jira-error';
import type { JiraWorkLogsStore }                 from '@features/jira-work-logs/jira-work-logs.types';
import type { TasksService } from '@features/tasks/tasks.service';
import type { TasksStore }   from '@features/tasks/tasks.types';
import type { TimersStore }  from '@features/timers/timers.types';

import { ApiError } from '@http/api-error';

import { boolean, record } from '@shared/coercion';

import { parseDate }             from '@time/date.helpers';
import type { DateCodec }  from '@time/date-codec';
import type { TimezoneProvider } from '@time/time.types';


export class JiraService {
  constructor(
    private readonly tasks: Pick<TasksService, 'get'>,
    private readonly taskRepository: Pick<TasksStore, 'names'>,
    private readonly timers: Pick<TimersStore, 'forTask'>,
    private readonly logs: Pick<JiraWorkLogsStore, 'forDate' | 'saveRemote'>,
    private readonly timezone: TimezoneProvider,
    private readonly dates: DateCodec,
    private readonly client: JiraTransport,
  ) {
  }

  public async sync(
    id: string,
    date: string,
  ): Promise<void> {
    const task: TaskRow = await this.tasks.get(id);
    const zone: string = await this.timezone.userTimezone();
    const day: DateTime = parseDate(date, zone)!.startOf('day');
    const end: DateTime = day.endOf('day').startOf('second');
    const canonical: string | null = day.toISODate();
    const existing: JiraWorkLogRow | undefined = await this.logs.forDate(id, canonical);
    const timers: TimerRow[] = await this.timers.forTask(id);
    let seconds: number = 0;
    let descriptions: string[] = [];

    for (const timer of timers) {
      const start: DateTime = this.dates.storedDate(timer.start_time);
      const finish: DateTime = timer.end_time ? this.dates.storedDate(timer.end_time) : end;

      if (+start > +end || +finish < +day) {
        continue;
      }

      seconds += Math.max(0, Math.floor(Math.min(+finish, +end) / 1000) - Math.floor(Math.max(+start, +day) / 1000));

      if (timer.description && timer.description !== '0') {
        descriptions.push(timer.description);
      }
    }

    const pieces: string[] = task.name.split('-#-');

    if (pieces.length > 1) {
      descriptions = [(pieces[1] ?? '').trim()];
    }

    let remote: Record<string, unknown> | undefined;

    try {
      const session: JiraSession = await this.client.session();

      if (seconds < 60) {
        throw new JiraError('Cannot report less than 60 second!');
      }

      const payload: JiraWorkLogPayload = {
        id: null,
        self: null,
        author: null,
        updateAuthor: null,
        updated: null,
        timeSpent: null,
        comment: descriptions.join(', '),
        started: day.set({
          hour: 17
        }).toFormat('yyyy-MM-dd\'T\'HH:mm:ss\'.000\'ZZZ'),
        timeSpentSeconds: seconds,
        visibility: null
      };
      const path: string = `/issue/${ (pieces[0] ?? '').trim() }/worklog`;

      if (existing?.work_log_id && existing.work_log_id !== '0') {
        try {
          remote = await session.request(`${ path }/${ parseInt(existing.work_log_id, 10) || 0 }`, payload, 'PUT');
        } catch (error) {
          if (!(error instanceof JiraError)) {
            throw error;
          }
        }
      }

      remote ??= await session.request(path, payload);
    } catch (error) {
      if (error instanceof JiraError) {
        throw new ApiError(409, ['Problems syncing with JIRA!', error.message]);
      }

      throw error;
    }

    // Remote success is deliberately not compensated if the following local write fails.
    await this.logs.saveRemote({
      id: existing?.id ?? randomUUID(),
      taskId: id,
      remoteId: String(remote.id ?? ''),
      seconds,
      date: canonical
    }, Boolean(existing));
  }

  public async missing(
    query: URLSearchParams,
  ): Promise<JiraSearchResult> {
    const fields: string[] = ['assignedToMe', 'reportedByMe', 'resolution', 'projects', 'limit'];

    for (const key of query.keys()) {
      if (fields.some(
        (
          field,
        ) => key.startsWith(field + '[',
        ))) {
        throw new ApiError(400, ['Bad Request']);
      }
    }

    const flag: (
      key: string,
      fallback: string,
    ) => boolean = (
      key: string,
      fallback: string,
    ) => {
      const value: string = (query.get(key) ?? fallback).trim();

      if (!/^(1|0|true|false|yes|no|on|off|)$/i.test(value)) {
        throw new ApiError(400, ['Bad Request']);
      }

      return boolean(value);
    };

    const assigned: boolean = flag('assignedToMe', 'true');
    const reported: boolean = flag('reportedByMe', 'false');
    const limitInput: string = (query.get('limit') ?? '50').trim();

    if (!/^[+-]?(0|[1-9]\d*)$/.test(limitInput) || !Number.isSafeInteger(Number(limitInput))) {
      throw new ApiError(400, ['Bad Request']);
    }

    const limit: number = Math.max(50, Math.min(200, Number(limitInput)));
    const resolution: string = (query.get('resolution') ?? 'unresolved').trim().toLowerCase();
    const projects: string = (query.get('projects') ?? '').trim();
    const errors: Record<string, string> = {};

    if (!['all', 'unresolved', 'resolved'].includes(resolution)) {
      errors.resolution = 'The value you selected is not a valid choice.';
    }

    if (projects && !/^[A-Z][A-Z0-9_]{1,9}(?:\s*,\s*[A-Z][A-Z0-9_]{1,9})*$/i.test(projects)) {
      errors.projects = 'Project keys must be comma-separated Jira project keys.';
    }

    if (!assigned && !reported && resolution === 'all' && !projects) {
      errors.criteria = 'Select at least one Jira search criterion.';
    }

    if (Object.keys(errors).length) {
      throw new ApiError(406, errors);
    }

    const clauses: (string | undefined)[] = [];
    const users: string[] = [assigned ? 'assignee = currentUser()' : '', reported ? 'reporter = currentUser()' : ''].filter(Boolean);

    if (users.length) {
      clauses.push(users.length > 1 ? `(${ users.join(' OR ') })` : users[0]);
    }

    if (resolution !== 'all') {
      clauses.push(`resolution IS ${ resolution === 'resolved' ? 'NOT ' : '' }EMPTY`);
    }

    if (projects) {
      clauses.push(`project IN (${ [...new Set(projects.toUpperCase().split(',').map(
        (
          key,
        ) => key.trim(
        )))].map(
        (
          key,
        ) => `"${ key }"`,
      ).join(', ') })`);
    }

    const jql: string = clauses.join(' AND ') + ' ORDER BY updated DESC';
    const known: Set<string> = new Set((await this.taskRepository.names()).map(
      (
        name,
      ) => (name.split('-#-',
      )[0] ?? '').trim().toUpperCase()).filter(
      (
        key,
      ) => /^[A-Z][A-Z0-9_]*-\d+$/.test(key,
      )));
    const result: JiraSearchResult['issues'] = [];

    try {
      const session: JiraSession = await this.client.session();
      let enhanced: boolean = false;
      let startAt: number = 0;
      let nextPageToken: unknown = '';

      for (; ;) {
        let page: Record<string, unknown>;
        const common: JiraSearchRequest = {
          jql,
          maxResults: limit,
          fields: ['summary', 'status', 'issuetype', 'updated']
        };

        try {
          page = await session.request(enhanced ? '/search/jql' : '/search', enhanced ? {
            ...common,
            expand: '',
            reconcileIssues: [],
            ...(nextPageToken ? {
              nextPageToken
            } : {})
          } : {
            ...common,
            startAt
          });
        } catch (error) {
          if (!enhanced && error instanceof JiraError && [404, 405, 410].includes(error.status)) {
            enhanced = true;
            continue;
          }

          throw error;
        }

        const issues: unknown[] = Array.isArray(page.issues) ? page.issues : [];

        for (const issue of issues) {
          if (!issue || typeof issue !== 'object') {
            continue;
          }

          const key: string = String(record(issue).key ?? '');
          const normalized: string = key.trim().toUpperCase();

          if (!normalized || known.has(normalized)) {
            continue;
          }

          known.add(normalized);
          const f: Record<string, unknown> = record(record(issue).fields);
          const updated: DateTime | null = typeof f.updated === 'string' ? DateTime.fromISO(f.updated, {
            setZone: true
          }) : null;
          result.push({
            key,
            summary: String(f.summary ?? ''),
            status: String(record(f.status).name ?? ''),
            issueType: String(record(f.issuetype).name ?? ''),
            updated: updated?.isValid ? updated.toFormat('yyyy-MM-dd\'T\'HH:mm:ssZZ') : null
          });

          if (result.length > limit) {
            return {
              issues: result.slice(0, limit),
              meta: {
                limit,
                truncated: true
              }
            };
          }
        }

        if (enhanced) {
          nextPageToken = page.nextPageToken ?? '';

          if (!nextPageToken) {
            break;
          }
        } else {
          startAt += issues.length;

          if (!issues.length || !Number.isInteger(page.total) || startAt >= Number(page.total)) {
            break;
          }
        }
      }
    } catch (error) {
      if (!(error instanceof JiraError)) {
        throw error;
      }

      throw new ApiError(502, ['Unable to search Jira.']);
    }

    return {
      issues: result,
      meta: {
        limit,
        truncated: false
      }
    };
  }
}
