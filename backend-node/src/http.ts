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
  reply.code(status);
  if (request.headers.accept?.includes('text/html')) {
    return reply.type('text/html; charset=UTF-8').send(`<!DOCTYPE html><html><head><title>An Error Occurred: ${detail}</title></head><body><h1>Oops! An Error Occurred</h1><h2>The server returned a "${status} ${detail}".</h2></body></html>`);
  }
  return reply.type('application/problem+json').send({ type: 'https://tools.ietf.org/html/rfc2616#section-10', title: 'An error occurred', status, detail });
}
export type Handler = (request: FastifyRequest, reply: FastifyReply, match: RegExpMatchArray) => Promise<unknown>;
export type Route = { path: RegExp; methods: Record<string, Handler> };
