import { Agent, fetch } from 'undici';
import type { JiraRequest, JiraTransport } from './features/jira/jira.types.js';
import type { SettingsStore } from './features/settings/settings.types.js';

export class JiraError extends Error { constructor(message: string, public readonly status = 0) { super(message); } }

export const boolean = (value: string): boolean => /^(1|true|yes|on)$/i.test(value.trim());

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value)) : {};
}

export class JiraClient implements JiraTransport {
  private readonly dispatcher = new Agent({ connect: { rejectUnauthorized: false, timeout: 60_000 } });
  constructor(private readonly settings: Pick<SettingsStore, 'jiraConfiguration'>) { }
  async close(): Promise<void> { await this.dispatcher.close(); }
  async session(): Promise<JiraRequest> {
    const settings = await this.settings.jiraConfiguration();
    if (!boolean(settings['jira.enabled'] ?? '')) throw new JiraError('JIRA sync not enabled!');
    const host = settings['jira.host'];
    const token = settings['jira.personal-access-token'];
    if (!host || host === '0' || !token || token === '0') throw new JiraError('No host or personal access token found!');
    return async (path: string, payload: unknown, method = 'POST'): Promise<Record<string, unknown>> => {
      const url = host.replace(/\/$/, '') + '/rest/api/2' + path;
      let response;
      const started = Date.now();
      try {
        response = await fetch(url, {
          method, body: JSON.stringify(payload), dispatcher: this.dispatcher, signal: AbortSignal.timeout(60_000), headers: {
            Accept: '*/*', 'Content-Type': 'application/json', 'X-Atlassian-Token': 'no-check', 'X-ExperimentalApi': 'opt-in', Authorization: `Bearer ${token}`,
          }
        });
      } catch (error) {
        const timedOut = error instanceof Error && error.name === 'TimeoutError';
        throw new JiraError('CURL Error: http response=0, ' + (timedOut
          ? `Operation timed out after ${Date.now() - started} milliseconds with 0 bytes received`
          : 'Jira request failed'));
      }
      let raw;
      try { raw = await response.text(); }
      catch (error) {
        // PHP legacy search translates an interrupted/empty response into its search error.
        if (path === '/search') throw new JiraError('Jira issue search failed.');
        throw error;
      }
      if (raw && ![200, 201].includes(response.status)) throw new JiraError(`CURL HTTP Request Failed: Status Code : ${response.status}, URL:${url}\nError Message : ${raw}`, response.status);
      if (!raw) {
        if (![200, 201, 204].includes(response.status)) throw new JiraError(`CURL Error: http response=${response.status}, `);
        if (path === '/search') throw new JiraError('Jira issue search failed.');
        throw new TypeError('Empty upstream body');
      }
      let result: unknown;
      try { result = JSON.parse(raw); }
      catch {
        if (path.startsWith('/search')) throw new JiraError('Jira issue search failed.');
        throw new TypeError('Invalid upstream work-log body');
      }
      if (result === null || typeof result !== 'object') {
        if (path === '/search') throw new JiraError('Jira issue search failed.');
        throw new TypeError('Invalid upstream body');
      }
      return record(result);
    };
  }
}
