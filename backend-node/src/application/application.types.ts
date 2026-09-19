import type { Database } from '../database/database.js';
import type { JiraTransport } from '../features/jira/jira.types.js';

export interface ApplicationResources { database?: Database; jira?: JiraTransport; }
