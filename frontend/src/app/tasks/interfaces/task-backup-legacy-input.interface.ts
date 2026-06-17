export interface LegacyTagInput {
  id?: string;
  _id?: string;
  name?: string;
  _name?: string;
}

export interface LegacyTimeLogInput {
  id?: string;
  _id?: string;
  startTime?: unknown;
  _startTime?: unknown;
  endTime?: unknown;
  _endTime?: unknown;
  description?: unknown;
  _description?: unknown;
}

export interface LegacyTaskInput {
  id?: string;
  _id?: string;
  createdAt?: unknown;
  _createdAt?: unknown;
  updatedAt?: unknown;
  _updatedAt?: unknown;
  name?: unknown;
  _name?: unknown;
  description?: unknown;
  _description?: unknown;
  timeLogs?: unknown;
  _timeLogs?: unknown;
  tags?: unknown;
  _tags?: unknown;
  lastTimeLog?: unknown;
  _lastTimeLog?: unknown;
  jiraWorkLogs?: unknown;
  _jiraWorkLogs?: unknown;
  timeLogged?: unknown;
  _timeLogged?: unknown;
  metadata?: unknown;
}
