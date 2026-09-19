export type JiraRequest = (path: string, payload: unknown, method?: string) => Promise<Record<string, unknown>>;

export interface JiraTransport { session(): Promise<JiraRequest>; close(): Promise<void>; }

export interface JiraSearchResult {
  issues: { key: string; summary: string; status: string; issueType: string; updated: string | null }[];
  meta: { limit: number; truncated: boolean };
}
