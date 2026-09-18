import { Agent, fetch } from 'undici';
import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { parseDate, storedDate, userTimezone } from './dates.js';
import { getTask } from './tasks.js';
import { ApiError, envelope, uuid, type Route } from './http.js';

export const jiraDispatcher = new Agent({ connect: { rejectUnauthorized: false, timeout: 60_000 } });
class JiraError extends Error { constructor(message: string, public status = 0) { super(message); } }
const boolean = (value: string) => /^(1|true|yes|on)$/i.test(value.trim());
async function client() {
  const settings = Object.fromEntries((await db.query("SELECT name,value FROM setting WHERE name IN ('jira.enabled','jira.host','jira.personal-access-token')")).rows.map(row => [row.name, row.value]));
  if (!boolean(settings['jira.enabled'] ?? '')) throw new JiraError('JIRA sync not enabled!');
  const host = settings['jira.host'];
  const token = settings['jira.personal-access-token'];
  if (!host || host === '0' || !token || token === '0') throw new JiraError('No host or personal access token found!');
  return async (path: string, payload: unknown, method = 'POST'): Promise<Record<string, any>> => {
    const url = host.replace(/\/$/, '') + '/rest/api/2' + path;
    let response;
    try {
      response = await fetch(url, { method, body: JSON.stringify(payload), dispatcher: jiraDispatcher, signal: AbortSignal.timeout(60_000), headers: {
        Accept: '*/*', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'no-check', 'X-ExperimentalApi': 'opt-in', Authorization: `Bearer ${token}`,
      } });
    } catch { throw new JiraError('CURL Error: http response=0, Jira request failed'); }
    const raw = await response.text();
    if (raw && ![200, 201].includes(response.status)) throw new JiraError(`CURL HTTP Request Failed: Status Code : ${response.status}, URL:${url}\nError Message : ${raw}`, response.status);
    if (!raw) {
      if (![200, 201, 204].includes(response.status)) throw new JiraError(`CURL Error: http response=${response.status}, `);
      throw new TypeError('Empty upstream body');
    }
    let result;
    try { result = JSON.parse(raw); } catch { throw new JiraError('Jira issue search failed.'); }
    if (result === null || typeof result !== 'object') throw new TypeError('Invalid upstream body');
    return result;
  };
}

async function sync(id: string, date: string) {
  const task = await getTask(id);
  const zone = await userTimezone();
  const day = parseDate(date, zone)!.startOf('day');
  const end = day.endOf('day').startOf('second');
  const canonical = day.toISODate();
  const existing = (await db.query('SELECT * FROM jira_work_log WHERE task_id=$1 AND start_time=$2 LIMIT 1', [id, canonical])).rows[0];
  const timers = (await db.query('SELECT * FROM time_log WHERE task_id=$1', [id])).rows;
  let seconds = 0;
  let descriptions = [];
  for (const timer of timers) {
    const start = storedDate(timer.start_time);
    const finish = timer.end_time ? storedDate(timer.end_time) : end;
    if (+start > +end || +finish < +day) continue;
    seconds += Math.max(0, Math.floor(Math.min(+finish, +end) / 1000) - Math.floor(Math.max(+start, +day) / 1000));
    if (timer.description && timer.description !== '0') descriptions.push(timer.description);
  }
  const pieces = task.name.split('-#-');
  if (pieces.length > 1) descriptions = [pieces[1].trim()];
  let remote;
  try {
    const request = await client();
    if (seconds < 60) throw new JiraError('Cannot report less than 60 second!');
    const payload = { id: null, self: null, author: null, updateAuthor: null, updated: null, timeSpent: null, comment: descriptions.join(', '), started: day.set({ hour: 17 }).toFormat("yyyy-MM-dd'T'HH:mm:ss'.000'ZZZ"), timeSpentSeconds: seconds, visibility: null };
    const path = `/issue/${pieces[0].trim()}/worklog`;
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
  if (existing) await db.query("UPDATE jira_work_log SET work_log_id=$2,time_spent_seconds=$3,start_time=$4,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1", [existing.id, String(remote.id ?? ''), seconds, canonical]);
  else await db.query("INSERT INTO jira_work_log (id,task_id,work_log_id,time_spent_seconds,start_time,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP))", [randomUUID(), id, String(remote.id ?? ''), seconds, canonical]);
}

async function missing(query: URLSearchParams) {
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
  const known = new Set((await db.query('SELECT name FROM task')).rows.map(row => row.name.split('-#-')[0].trim().toUpperCase()).filter(key => /^[A-Z][A-Z0-9_]*-\d+$/.test(key)));
  const result = [];
  try {
    const request = await client();
    let enhanced = false;
    let startAt = 0;
    let nextPageToken = '';
    for (;;) {
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
        const key = String(issue.key ?? '');
        const normalized = key.trim().toUpperCase();
        if (!normalized || known.has(normalized)) continue;
        known.add(normalized);
        const f = issue.fields ?? {};
        const updated = typeof f.updated === 'string' ? DateTime.fromISO(f.updated, { setZone: true }) : null;
        result.push({ key, summary: String(f.summary ?? ''), status: String(f.status?.name ?? ''), issueType: String(f.issuetype?.name ?? ''), updated: updated?.isValid ? updated.toFormat("yyyy-MM-dd'T'HH:mm:ssZZ") : null });
        if (result.length > limit) return envelope(result.slice(0, limit), undefined, { limit, truncated: true });
      }
      if (enhanced) { nextPageToken = page.nextPageToken ?? ''; if (!nextPageToken) break; }
      else { startAt += issues.length; if (!issues.length || !Number.isInteger(page.total) || startAt >= page.total) break; }
    }
  } catch (error) {
    if (!(error instanceof JiraError)) throw error;
    throw new ApiError(502, ['Unable to search Jira.']);
  }
  return envelope(result, undefined, { limit, truncated: false });
}
export const jiraRoutes: Route[] = [
  { path: /^\/api\/task\/jira\/missing$/, methods: { GET: async request => missing(new URL(request.url, 'http://localhost').searchParams) } },
  { path: new RegExp(`^/api/task/(${uuid})/([0-9]{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|(?<!02-)3[01]))$`), methods: {
    POST: async (_request, reply, match) => { await sync(match[1], match[2]); return reply.code(204).send(); },
  } },
];
