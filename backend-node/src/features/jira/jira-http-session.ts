import { type Dispatcher, fetch } from 'undici';

import { JIRA_TIMEOUT_MS }  from '@features/jira/jira.constants';
import type { JiraSession } from '@features/jira/jira.types';
import { JiraError } from '@features/jira/jira-error';

import { record }                 from '@shared/coercion';


export class JiraHttpSession implements JiraSession {
  constructor(
    private readonly dispatcher: Dispatcher,
    private readonly host: string,
    private readonly token: string,
  ) {
  }

  public async request(
    path: string,
    payload: unknown,
    method = 'POST',
  ): Promise<Record<string, unknown>> {
    const url: string = this.host.replace(/\/$/, '') + '/rest/api/2' + path;
    let response: Awaited<ReturnType<typeof fetch>>;
    const started: number = Date.now();

    try {
      response = await fetch(url, {
        method,
        body: JSON.stringify(payload),
        dispatcher: this.dispatcher,
        signal: AbortSignal.timeout(JIRA_TIMEOUT_MS),
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'X-Atlassian-Token': 'no-check',
          'X-ExperimentalApi': 'opt-in',
          Authorization: `Bearer ${ this.token }`
        }
      });
    } catch (error) {
      const timedOut: boolean = error instanceof Error && error.name === 'TimeoutError';
      throw new JiraError('CURL Error: http response=0, ' + (timedOut
        ? `Operation timed out after ${ Date.now() - started } milliseconds with 0 bytes received`
        : 'Jira request failed'));
    }

    let raw: string;

    try {
      raw = await response.text();
    } catch (error) {
      // PHP legacy search translates an interrupted/empty response into its search error.
      if (path === '/search') {
        throw new JiraError('Jira issue search failed.');
      }

      throw error;
    }

    if (raw && ![200, 201].includes(response.status)) {
      throw new JiraError(`CURL HTTP Request Failed: Status Code : ${ response.status }, URL:${ url }\nError Message : ${ raw }`, response.status);
    }

    if (!raw) {
      if (![200, 201, 204].includes(response.status)) {
        throw new JiraError(`CURL Error: http response=${ response.status }, `);
      }

      if (path === '/search') {
        throw new JiraError('Jira issue search failed.');
      }

      throw new TypeError('Empty upstream body');
    }

    let result: unknown;

    try {
      result = JSON.parse(raw);
    } catch {
      if (path.startsWith('/search')) {
        throw new JiraError('Jira issue search failed.');
      }

      throw new TypeError('Invalid upstream work-log body');
    }

    if (result === null || typeof result !== 'object') {
      if (path === '/search') {
        throw new JiraError('Jira issue search failed.');
      }

      throw new TypeError('Invalid upstream body');
    }

    return record(result);
  }
}
