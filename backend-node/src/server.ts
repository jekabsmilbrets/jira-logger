import Fastify from 'fastify';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';
import { db } from './db.js';
import { ApiError, envelope, frameworkError, type Route } from './http.js';
import { settingsRoutes } from './settings.js';
import { tagRoutes } from './tags.js';
import { taskRoutes } from './tasks.js';
import { timerRoutes } from './timers.js';

export function buildServer() {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] }, exposeHeadRoutes: false });
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, value, done) => done(null, value));
  const routes: Route[] = [...settingsRoutes, ...tagRoutes, ...taskRoutes, ...timerRoutes];
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) return reply.code(error.status).send(envelope(undefined, error.errors));
    request.log.error({ error: error instanceof Error ? error.name : 'Error' }, 'Request failed');
    return frameworkError(request, reply);
  });
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (!origin || !new RegExp(config.corsOrigin).test(origin)) return;
    reply.header('Access-Control-Allow-Origin', origin).header('Access-Control-Expose-Headers', '*');
    if (request.method === 'OPTIONS' && request.headers['access-control-request-method']) {
      return reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST, PUT, PATCH, DELETE')
        .header('Access-Control-Allow-Headers', request.headers['access-control-request-headers'] ?? '')
        .header('Access-Control-Max-Age', '3600').code(200).send('');
    }
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
      const allow = new Set(['GET', 'HEAD', ...Object.keys(route?.methods ?? {})]);
      reply.header('Allow', [...allow].join(', '));
      return frameworkError(request, reply, 405);
    }
    return reply.type('text/html; charset=UTF-8').send(await readFile(`${config.assets}/index.html`));
  });
  app.addHook('onClose', async () => { await db.end(); });
  return app;
}

const app = buildServer();
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void app.close(); });
await app.listen({ host: '0.0.0.0', port: config.port });
