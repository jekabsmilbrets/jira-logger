import { Agent, type Dispatcher } from 'undici';

import { JIRA_TIMEOUT_MS }                 from '@features/jira/jira.constants';
import type { JiraSession, JiraTransport } from '@features/jira/jira.types';
import { JiraError }       from '@features/jira/jira-error';
import { JiraHttpSession } from '@features/jira/jira-http-session';
import type { SettingsStore }              from '@features/settings/settings.types';

import { boolean }                from '@shared/coercion';


export class JiraClient implements JiraTransport {
  constructor(
    private readonly settings: Pick<SettingsStore, 'jiraConfiguration'>,
    private readonly dispatcher: Dispatcher = new Agent({
      connect: {
        rejectUnauthorized: false,
        timeout: JIRA_TIMEOUT_MS
      }
    }),
  ) {
  }

  public async close(): Promise<void> {
    await this.dispatcher.close();
  }

  public async session(): Promise<JiraSession> {
    const settings: Record<string, string> = await this.settings.jiraConfiguration();

    if (!boolean(settings['jira.enabled'] ?? '')) {
      throw new JiraError('JIRA sync not enabled!');
    }

    const host: string | undefined = settings['jira.host'];
    const token: string | undefined = settings['jira.personal-access-token'];

    if (!host || host === '0' || !token || token === '0') {
      throw new JiraError('No host or personal access token found!');
    }

    return new JiraHttpSession(this.dispatcher, host, token);
  }
}
