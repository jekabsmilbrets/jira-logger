import type { FastifyReply, FastifyRequest } from 'fastify';

export const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[13-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
export class ApiError extends Error {
  constructor(public status: number, public errors: string[] | Record<string, string>) { super('API error'); }
}
export function envelope(data?: unknown, errors?: unknown, meta?: unknown) {
  const output: Record<string, unknown> = {};
  if (data && data !== '0' && !(Array.isArray(data) && data.length === 0)) output.data = data;
  if (meta !== undefined && meta !== null) output.meta = meta;
  if (errors !== undefined && errors !== null) output.errors = errors;
  return Object.keys(output).length ? output : [];
}
export function body(request: FastifyRequest): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(String(request.body ?? '')); }
  catch { throw new ApiError(400, ['Bad Request']); }
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}
export function stringFields(input: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    if (field in input && typeof input[field] !== 'string') throw new ApiError(400, ['Bad Request']);
  }
}
export function lengths(input: Record<string, unknown>, limits: Record<string, [number, number]>) {
  const errors: Record<string, string> = {};
  for (const [field, [min, max]] of Object.entries(limits)) {
    if (!(field in input)) continue;
    const length = [...String(input[field])].length;
    if (length < min) errors[field] = `This value is too short. It should have ${min} characters or more.`;
    if (length > max) errors[field] = `This value is too long. It should have ${max} characters or less.`;
  }
  if (Object.keys(errors).length) throw new ApiError(406, errors);
}
export function frameworkError(request: FastifyRequest, reply: FastifyReply, status = 500) {
  const detail = status === 405 ? 'Method Not Allowed' : 'Internal Server Error';
  reply.code(status).header('Vary', 'Accept');
  const accepted = (request.headers.accept ?? '').split(',').map(value => {
    const [type, ...parameters] = value.trim().split(';');
    const quality = parameters.find(value => value.trim().startsWith('q='));
    return { type, quality: quality ? Number(quality.trim().slice(2)) : 1 };
  }).sort((a, b) => b.quality - a.quality);
  const known = ['text/html', 'application/xhtml+xml', 'text/plain', 'application/json', 'application/x-json', 'text/xml', 'application/xml', 'application/x-xml', 'application/problem+json'];
  const format = accepted.find(value => known.includes(value.type!))?.type;
  const problem = { type: 'https://tools.ietf.org/html/rfc2616#section-10', title: 'An error occurred', status, detail };
  if (format === 'application/json' || format === 'application/x-json') return reply.type('application/json').send(problem);
  if (['text/xml', 'application/xml', 'application/x-xml'].includes(format ?? '')) {
    return reply.type('text/xml; charset=UTF-8').send(`<?xml version="1.0"?>\n<response><type>${problem.type}</type><title>${problem.title}</title><status>${status}</status><detail>${detail}</detail></response>\n`);
  }
  return reply.type('text/html; charset=UTF-8').send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <title>An Error Occurred: ${detail}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22><text y=%221.2em%22 font-size=%2296%22>❌</text></svg>" />
    <style>body { background-color: #fff; color: #222; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; }
.container { margin: 30px; max-width: 600px; }
h1 { color: #dc3545; font-size: 24px; }
h2 { font-size: 18px; }</style>
</head>
<body>
<div class="container">
    <h1>Oops! An Error Occurred</h1>
    <h2>The server returned a "${status} ${detail}".</h2>

    <p>
        Something is broken. Please let us know what you were doing when this error occurred.
        We will fix it as soon as possible. Sorry for any inconvenience caused.
    </p>
</div>
</body>
</html>`);
}
export type Handler = (request: FastifyRequest, reply: FastifyReply, match: RegExpMatchArray) => Promise<unknown>;
export type Route = { path: RegExp; methods: Record<string, Handler> };
