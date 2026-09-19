import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockAgent } from 'undici';
import { JiraClient } from '../dist/features/jira/jira-client.js';

test('Jira sessions retain their configuration and share only the injected transport', async () => {
  const dispatcher = new MockAgent();
  dispatcher.disableNetConnect();
  let token = 'first-fixture-token';
  const client = new JiraClient({ jiraConfiguration: async () => ({
    'jira.enabled': 'true', 'jira.host': 'https://jira.invalid/context/', 'jira.personal-access-token': token,
  }) }, dispatcher);
  try {
    const first = await client.session();
    token = 'second-fixture-token';
    const second = await client.session();
    for (const [session, credential, id] of [[first, 'first-fixture-token', '1'], [second, token, '2']]) {
      dispatcher.get('https://jira.invalid').intercept({
        path: '/context/rest/api/2/issue/DEMO-1/worklog', method: 'POST',
        headers: { authorization: `Bearer ${credential}`, 'content-type': 'application/json' },
        body: JSON.stringify({ timeSpentSeconds: 60 }),
      }).reply(201, { id });
      assert.deepEqual(await session.request('/issue/DEMO-1/worklog', { timeSpentSeconds: 60 }), { id });
    }
    dispatcher.assertNoPendingInterceptors();
  } finally { await client.close(); }
});
