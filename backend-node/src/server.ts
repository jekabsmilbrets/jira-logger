import type { FastifyInstance } from 'fastify';
import { pathToFileURL } from 'node:url';
import { Application } from './application/application.js';
import { HttpServer } from './http/http-server.js';

// Compatibility adapters for existing callers; lifecycle state belongs to HttpServer.
export function buildServer(application = new Application()): FastifyInstance {
  return new HttpServer(application).instance;
}

export async function startServer(application = new Application()): Promise<FastifyInstance> {
  try { return await new HttpServer(application).start(); }
  catch (error) { await application.close(); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const application = new Application();
  try {
    const app = await startServer(application);
    for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void app.close(); });
  } catch { await application.close(); console.error('Server startup failed'); process.exitCode = 1; }
}
