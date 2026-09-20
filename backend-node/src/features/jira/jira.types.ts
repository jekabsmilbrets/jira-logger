export interface JiraSession {
  request(
    path: string,
    payload: unknown,
    method?: string,
  ): Promise<Record<string, unknown>>;
}

export interface JiraTransport {
  session(): Promise<JiraSession>;

  close(): Promise<void>;
}

export interface JiraSearchResult {
  issues: {
    key: string;
    summary: string;
    status: string;
    issueType: string;
    updated: string | null
  }[];
  meta: {
    limit: number;
    truncated: boolean
  };
}

export interface JiraSearchRequest {
  jql: string;
  maxResults: number;
  fields: string[];
}

export interface JiraWorkLogPayload {
  id: null;
  self: null;
  author: null;
  updateAuthor: null;
  updated: null;
  timeSpent: null;
  comment: string;
  started: string;
  timeSpentSeconds: number;
  visibility: null;
}
