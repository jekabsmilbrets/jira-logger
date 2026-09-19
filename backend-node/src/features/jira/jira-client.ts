import { Agent, type Dispatcher } from 'undici';
import { boolean } from '../../shared/coercion.js';
import type { SettingsStore } from '../settings/settings.types.js';
import { JiraError } from './jira-error.js';
import { JiraHttpSession } from './jira-http-session.js';
import { JIRA_TIMEOUT_MS } from './jira.constants.js';
import type { JiraSession, JiraTransport } from './jira.types.js';

export class JiraClient implements JiraTransport {
  constructor(
    private readonly settings: Pick<SettingsStore, 'jiraConfiguration'>,
    private readonly dispatcher: Dispatcher = new Agent({ connect: { rejectUnauthorized: false, timeout: JIRA_TIMEOUT_MS } }),
  ) { }
  async close(): Promise<void> { await this.dispatcher.close(); }
  async session(): Promise<JiraSession> {
    const settings = await this.settings.jiraConfiguration();
    if (!boolean(settings['jira.enabled'] ?? '')) throw new JiraError('JIRA sync not enabled!');
    const host = settings['jira.host'];
    const token = settings['jira.personal-access-token'];
    if (!host || host === '0' || !token || token === '0') throw new JiraError('No host or personal access token found!');
    return new JiraHttpSession(this.dispatcher, host, token);
  }
}
