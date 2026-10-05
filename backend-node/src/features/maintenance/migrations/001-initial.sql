CREATE TABLE setting (
  id TEXT COLLATE NOCASE NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE tag (
  id TEXT COLLATE NOCASE NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE task (
  id TEXT COLLATE NOCASE NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE tag_task (
  tag_id TEXT COLLATE NOCASE NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  task_id TEXT COLLATE NOCASE NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  PRIMARY KEY(tag_id, task_id)
) STRICT;
CREATE INDEX tag_task_tag ON tag_task(tag_id);
CREATE INDEX tag_task_task ON tag_task(task_id);
CREATE TABLE time_log (
  id TEXT COLLATE NOCASE NOT NULL PRIMARY KEY,
  task_id TEXT COLLATE NOCASE NOT NULL REFERENCES task(id),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX time_log_task ON time_log(task_id);
CREATE TABLE jira_work_log (
  id TEXT COLLATE NOCASE NOT NULL PRIMARY KEY,
  task_id TEXT COLLATE NOCASE NOT NULL REFERENCES task(id),
  work_log_id TEXT NOT NULL,
  description TEXT,
  time_spent_seconds INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX jira_work_log_task ON jira_work_log(task_id);
