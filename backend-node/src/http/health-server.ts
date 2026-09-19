import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PRIVATE_HOST, READINESS_PATH } from './http.constants.js';
import type { ReadinessProbe } from './http.types.js';

export class HealthServer {
  private readonly server: Server;

  constructor(private readonly readiness: ReadinessProbe, private readonly port: number) {
    this.server = createServer((request, response) => { void this.handle(request, response); });
  }

  address(): AddressInfo | null {
    const address = this.server.address();
    return typeof address === 'object' ? address : null;
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => { this.server.off('listening', listening); reject(error); };
      const listening = () => { this.server.off('error', failed); resolve(); };
      this.server.once('error', failed);
      this.server.once('listening', listening);
      this.server.listen(this.port, PRIVATE_HOST);
    });
  }

  async close(): Promise<void> {
    if (this.server.listening) {
      await new Promise<void>((resolve, reject) => this.server.close(error => error ? reject(error) : resolve()));
    }
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'GET' || request.url !== READINESS_PATH) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'application/json');
    try { await this.readiness.ready(); response.end(JSON.stringify({ ready: true })); }
    catch { response.writeHead(503).end(JSON.stringify({ ready: false })); }
  }
}
