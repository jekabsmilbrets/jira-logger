import { TimersRepository } from './timers.repository.js';
import { DateCodec } from './dates.js';
import { TasksRepository } from './tasks.repository.js';
import { ResponseMapper } from './projections.js';
import { ReportService } from './reports.js';
import { Database } from './db.js';
import { SettingsRepository } from './settings.repository.js';
import { TagsRepository } from './tags.repository.js';
import { TimezoneService } from './dates.js';
import Fastify from 'fastify';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { db } from './db.js';
import { ApiError, envelope, frameworkError, type Route } from './http.js';
import { SettingsController, SettingsService } from './settings.js';
import { TagsController, TagsService } from './tags.js';
import { TasksController, TasksService } from './tasks.js';
import { TimersController, TimersService } from './timers.js';
import { jiraRoutes, jiraDispatcher } from './jira.js';
import { jiraWorkLogRoutes } from './jira-work-logs.js';
import { DateTime } from 'luxon';
import { userTimezone } from './dates.js';
import { fileLogStream } from './logging.js';
import { pathToFileURL } from 'node:url';
import { documentation } from './documentation.js';

export function buildServer() {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'], ...(process.env.LOG_FILE ? { stream: fileLogStream(process.env.LOG_FILE) } : {}) }, exposeHeadRoutes: false });
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, value, done) => done(null, value));
  app.addHook('onSend', async (_request, reply, payload) => {
    if (String(reply.getHeader('content-type')).startsWith('application/json')) reply.header('content-type', 'application/json');
    return payload;
  });
  const settings = new SettingsRepository(db);
  const timezone = new TimezoneService(settings, config.userTimezone);
  const settingsRoutes = new SettingsController(new SettingsService(settings)).routes();
  const tagRoutes = new TagsController(new TagsService(new TagsRepository(db), timezone)).routes();
  const tasksRepository = new TasksRepository(new Database(db));
  const tasks = new TasksService(tasksRepository, new TagsRepository(db), timezone, new ResponseMapper());
  const taskRoutes = new TasksController(tasks, new ReportService(tasksRepository, tasks, timezone)).routes();
  const timerRoutes = new TimersController(new TimersService(new TimersRepository(db), tasks, timezone, new DateCodec(config.internalTimezone))).routes();
  const routes: Route[] = [...settingsRoutes, ...tagRoutes, ...taskRoutes, ...timerRoutes, ...jiraRoutes, ...jiraWorkLogRoutes,
    { path: /^\/api\/doc$/, methods: { GET: async (_request, reply) => reply.type('text/html; charset=UTF-8').send(documentation) } },
    { path: /^\/api\/monitor$/, methods: { GET: async () => envelope({ time: DateTime.now().setZone(await userTimezone()).toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"), message: 'Welcome to Jira-logger API!' }) } },
  ];
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) return reply.code(error.status).send(envelope(undefined, error.errors));
    request.log.error({ error: error instanceof Error ? error.name : 'Error' }, 'Request failed');
    return frameworkError(request, reply);
  });
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin) return;
    const allowed = new RegExp(config.corsOrigin).test(origin);
    if (allowed) reply.header('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS' && request.headers['access-control-request-method']) {
      return reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, PATCH, DELETE')
        .header('Access-Control-Allow-Headers', request.headers['access-control-request-headers'] ?? '')
        .header('Access-Control-Max-Age', '3600').code(200).send('');
    }
    if (allowed) reply.header('Access-Control-Expose-Headers', '*');
  });
  app.get('/internal/ready', async (_request, reply) => {
    try { await db.query('SELECT 1'); return { ready: true }; }
    catch { return reply.code(503).send({ ready: false }); }
  });
  app.all('/*', async (request, reply) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const method = request.method === 'HEAD' ? 'GET' : request.method;
    const route = routes.find(route => route.path.test(path));
    if (route) {
      const handler = route.methods[method];
      if (handler) return handler(request, reply, path.match(route.path)!);
    }
    if (method !== 'GET') {
      const allow = new Set([...Object.keys(route?.methods ?? {}), 'GET']);
      reply.header('Allow', [...allow].join(', '));
      return frameworkError(request, reply, 405);
    }
    return reply.type('text/html; charset=UTF-8').send(await readFile(`${config.assets}/index.html`));
  });
  app.addHook('onClose', async () => { await db.end(); await jiraDispatcher.close(); });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = buildServer();
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void app.close(); });
  await app.listen({ host: '0.0.0.0', port: config.port });
}
