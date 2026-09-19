import type { Database } from '../db.js';
import type { JiraTransport } from '../features/jira/jira.types.js';

export interface ApplicationResources { database?: Database; jira?: JiraTransport; }
