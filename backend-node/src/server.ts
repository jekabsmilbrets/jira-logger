import Fastify, { type FastifyInstance } from 'fastify';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import fastifyStatic from '@fastify/static';
import { pathToFileURL } from 'node:url';
import { DateTime } from 'luxon';
import { Application } from './application.js';
import { ApiError, envelope, frameworkError, type Route } from './http.js';
import { fileLogStream } from './logging.js';
import { documentation } from './documentation.js';

export function buildServer(application = new Application()): FastifyInstance {
  const { config } = application;
  const app = Fastify({
    logger: { redact: ['req.headers.authorization'], ...(config.logFile ? { stream: fileLogStream(config.logFile) } : {}) },
    exposeHeadRoutes: false,
    ...(config.tlsCertificate ? { https: { cert: readFileSync(config.tlsCertificate), key: readFileSync(config.tlsKey!), minVersion: 'TLSv1.2' as const } } : {}),
  });
  app.register(fastifyStatic, { root: config.assets, prefix: '/ng/', dotfiles: 'ignore' });
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, value, done) => done(null, value));
  app.addHook('onSend', async (_request, reply, payload) => {
    if (config.tlsCertificate) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (String(reply.getHeader('content-type')).startsWith('application/json')) reply.header('content-type', 'application/json');
    return payload;
  });
  const routes: Route[] = [...application.routes(),
    { path: /^\/api\/doc$/, methods: { GET: async (_request, reply) => reply.type('text/html; charset=UTF-8').send(documentation) } },
    { path: /^\/api\/monitor$/, methods: { GET: async () => envelope({ time: DateTime.now().setZone(await application.timezone.userTimezone()).toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"), message: 'Welcome to Jira-logger API!' }) } },
  ];
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) return reply.code(error.status).send(envelope(undefined, error.errors));
    request.log.error({ error: error instanceof Error ? error.name : 'Error' }, 'Request failed');
    return frameworkError(request, reply);
  });
  app.addHook('onRequest', async (request, reply) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/internal/ready' || /\.php(?:\/|$)/.test(path)) return reply.code(404).send();
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
  app.addHook('onClose', async () => { await application.close(); });
  return app;
}

export async function startServer(application = new Application()): Promise<FastifyInstance> {
  const app = buildServer(application);
  // A separate loopback listener keeps readiness private with or without a proxy.
  const health = createServer(async (request, response) => {
    if (request.method !== 'GET' || request.url !== '/internal/ready') { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'application/json');
    try { await application.ready(); response.end(JSON.stringify({ ready: true })); }
    catch { response.writeHead(503).end(JSON.stringify({ ready: false })); }
  });
  app.addHook('onClose', async () => {
    if (health.listening) await new Promise<void>((resolve, reject) => health.close(error => error ? reject(error) : resolve()));
  });
  try {
    // Never open public ingress when startup readiness fails.
    await application.ready();
    await new Promise<void>((resolve, reject) => {
      health.once('error', reject);
      health.listen(application.config.healthPort, '127.0.0.1', resolve);
    });
    await app.listen({ host: '0.0.0.0', port: application.config.port });
    return app;
  } catch (error) { await app.close(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const application = new Application();
  try {
    const app = await startServer(application);
    for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void app.close(); });
  } catch { await application.close(); console.error('Server startup failed'); process.exitCode = 1; }
}
