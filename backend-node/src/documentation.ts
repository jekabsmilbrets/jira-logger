const operations = [
  ['GET, POST', '/api/task', 'List filtered task reports or create a task. Filters: tags, name, date, startDate, endDate, hideUnreported. Writes: name, description, tags.'],
  ['GET, PATCH, DELETE', '/api/task/{id}', 'Read, update, or delete a task and its dependent local records.'],
  ['GET', '/api/task/active', 'Read the task with the latest running timer; 404 means none.'],
  ['GET', '/api/task/today/seconds', 'Return data.totalSeconds for the current user-timezone day.'],
  ['GET', '/api/task/exist/{name}', 'Exact trimmed name lookup, including slashes; 409 exists, 204 absent.'],
  ['GET', '/api/task/jira/missing', 'Search Jira with assignedToMe, reportedByMe, resolution, projects, limit (50–200). Returns limit/truncated metadata; an empty result omits data.'],
  ['POST', '/api/task/{id}/{date}', 'Synchronize a calendar date to Jira. Remote write precedes local persistence. At least 60 seconds is required.'],
  ['GET, POST', '/api/task/{taskId}/time-log', 'List or create timers. Writes: startTime, endTime, description. The route determines task identity.'],
  ['GET, PATCH, DELETE', '/api/task/{taskId}/time-log/{id}', 'Read, update, or delete a timer scoped to its task. Null endTime/description retain existing values.'],
  ['POST', '/api/task/{taskId}/time-log/start', 'Commit stopping all running timers, then insert a new timer; 204 on success.'],
  ['POST', '/api/task/{taskId}/time-log/stop', 'Stop the latest running timer; 204 on success, 409 when no timer can be stopped.'],
  ['GET, POST', '/api/tag', 'List or create tags. Name length: 3–255.'],
  ['GET, PATCH, DELETE', '/api/tag/{id}', 'Read/update/delete a tag. Deleting an in-use tag returns 409.'],
  ['GET, POST', '/api/setting', 'List or create settings. Name length: 3–255; string value length: 3–512. Both are unique.'],
  ['GET, PATCH, DELETE', '/api/setting/{id}', 'Read/update/delete a setting. Secret values are redacted; the redaction marker cannot be saved.'],
  ['GET, POST', '/api/jira-work-log', 'Local records only. Writes accept task, description, timeSpentSeconds. Creation retains the existing failure caused by unavailable mandatory remote identity/date fields.'],
  ['GET, PATCH, DELETE', '/api/jira-work-log/{id}', 'Read/update/delete a local Jira work log without making a Jira request.'],
  ['GET', '/api/monitor', 'Return time and the API welcome message.'],
];

export const documentation = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jira Logger API</title>
<style>body{font:16px/1.5 system-ui;max-width:1100px;margin:3rem auto;padding:0 1rem;color:#182230}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:1rem;border-bottom:1px solid #ddd;vertical-align:top}code{overflow-wrap:anywhere}th{background:#f1f4f8}</style>
<h1>Jira Logger API</h1><p>33 operations, shared by the PHP and Node backends. Successful resource writes return 200; deletions and timer lifecycle operations return 204. Empty resource collections return 404.</p>
<p>JSON responses use <code>data</code>, <code>meta</code>, and <code>errors</code>. Falsy data is omitted. Controller validation uses 406 with property-keyed errors; malformed JSON uses 400. Framework failures negotiate JSON or HTML. Unsupported methods return 405 with Allow.</p>
<p>Dates accept Unix seconds, thirteen-digit Unix milliseconds, ISO timestamps, year-first local dates/datetimes, and day-first dates. Natural-language relative dates are unsupported. Reports clip responses without modifying stored timers. A single date takes precedence over a complete range.</p>
<table><thead><tr><th>Method</th><th>Path</th><th>Contract</th></tr></thead><tbody>${operations.map(([method, path, description]) => `<tr><td>${method}</td><td><code>${path}</code></td><td>${description}</td></tr>`).join('')}</tbody></table>
<p>Unknown GET/HEAD paths serve the Angular application. A matched API handler's 404 remains JSON. Authentication and CORS follow the existing deployment configuration.</p></html>`;
