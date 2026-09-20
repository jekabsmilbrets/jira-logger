import { readFileSync }                                                          from 'node:fs';
import { readFile }                                                              from 'node:fs/promises';

import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import type { Application } from '@application/application';

import { ApiError }                                               from '@http/api-error';
import { HealthServer }                                           from '@http/health-server';
import { CORS_METHODS, HSTS_POLICY, PUBLIC_HOST, READINESS_PATH } from '@http/http.constants';
import type { Handler, Route }                                    from '@http/http.types';
import { envelope, frameworkError }                               from '@http/response.helpers';

import { FileLogStream }                                                         from '@logging/file-log-stream';


export class HttpServer {
  private readonly server: FastifyInstance;
  private readonly health: HealthServer;
  private readonly routes: Route[];

  constructor(
    private readonly application: Application,
  ) {
    const { config } = application;
    this.server = Fastify({
      logger: {
        redact: ['req.headers.authorization'],
        ...(config.logFile ? {
          stream: new FileLogStream(config.logFile)
        } : {})
      },
      exposeHeadRoutes: false,
      ...(config.tlsCertificate ? {
        https: {
          cert: readFileSync(config.tlsCertificate),
          key: readFileSync(config.tlsKey!),
          minVersion: 'TLSv1.2' as const
        }
      } : {})
    });
    this.server.register(fastifyRateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute'
    });
    this.health = new HealthServer(application, config.healthPort);
    this.routes = application.routes();
    this.configureContent();
    this.configureHeaders();
    this.server.setErrorHandler((
      error,
      request,
      reply,
    ) => this.handleError(error, request, reply));
    this.server.all('/*', {
      config: {
        rateLimit: {
          max: 100,
          timeWindow: '1 minute'
        }
      }
    }, (
      request,
      reply,
    ) => this.dispatch(request, reply));
    this.server.addHook('onClose', async () => {
      try {
        await this.health.close();
      } finally {
        await application.close();
      }
    });
  }

  public get instance(): FastifyInstance {
    return this.server;
  }

  public async start(): Promise<FastifyInstance> {
    try {
      // Never open public ingress when startup readiness fails.
      await this.application.ready();
      await this.health.start();
      await this.server.listen({
        host: PUBLIC_HOST,
        port: this.application.config.port
      });

      return this.server;
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.server.close();
  }

  private configureContent(): void {
    this.server.register(fastifyStatic, {
      root: this.application.config.assets,
      prefix: '/ng/',
      dotfiles: 'ignore'
    });
    this.server.removeAllContentTypeParsers();
    this.server.addContentTypeParser('*', {
      parseAs: 'string'
    }, (
      _request,
      value,
      done,
    ) => done(null, value));
  }

  private configureHeaders(): void {
    this.server.addHook('onSend', async (
      _request,
      reply,
      payload,
    ) => {
      if (this.application.config.tlsCertificate) {
        reply.header('Strict-Transport-Security', HSTS_POLICY);
      }

      if (String(reply.getHeader('content-type')).startsWith('application/json')) {
        reply.header('content-type', 'application/json');
      }

      return payload;
    });
    this.server.addHook('onRequest', (
      request,
      reply,
    ) => this.handleRequest(request, reply));
  }

  private handleError(
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ): FastifyReply {
    if (error instanceof ApiError) {
      return reply.code(error.status).send(envelope(undefined, error.errors));
    }

    request.log.error({
      error: error instanceof Error ? error.name : 'Error'
    }, 'Request failed');

    return frameworkError(request, reply);
  }

  private async handleRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<unknown> {
    const path: string = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);

    if (path === READINESS_PATH || /\.php(?:\/|$)/.test(path)) {
      return reply.code(404).send();
    }

    const origin: string | undefined = request.headers.origin;

    if (!origin) {
      return;
    }

    const allowed: boolean = new RegExp(this.application.config.corsOrigin).test(origin);

    if (allowed) {
      reply.header('Access-Control-Allow-Origin', origin);
    }

    if (request.method === 'OPTIONS' && request.headers['access-control-request-method']) {
      return reply.header('Access-Control-Allow-Methods', CORS_METHODS)
        .header('Access-Control-Allow-Headers', request.headers['access-control-request-headers'] ?? '')
        .header('Access-Control-Max-Age', '3600').code(200).send('');
    }

    if (allowed) {
      reply.header('Access-Control-Expose-Headers', '*');
    }
  }

  private async dispatch(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<unknown> {
    const path: string = new URL(request.url, 'http://localhost').pathname;
    const method: string = request.method === 'HEAD' ? 'GET' : request.method;
    const route: Route | undefined = this.routes.find(
      (
        route,
      ) => route.path.test(path,
      ));

    if (route) {
      const handler: Handler | undefined = route.methods[method];

      if (handler) {
        return handler(request, reply, path.match(route.path)!);
      }
    }

    if (method !== 'GET') {
      const allow: Set<string> = new Set([...Object.keys(route?.methods ?? {}), 'GET']);
      reply.header('Allow', [...allow].join(', '));

      return frameworkError(request, reply, 405);
    }

    return reply.type('text/html; charset=UTF-8').send(await readFile(`${ this.application.config.assets }/index.html`));
  }
}
