import type { Database } from '@database/database';

import type { JiraTransport } from '@features/jira/jira.types';


export interface ApplicationResources {
  database?: Database;
  jira?: JiraTransport;
}
