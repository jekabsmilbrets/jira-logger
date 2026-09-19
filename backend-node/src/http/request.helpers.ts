import type { FastifyRequest } from 'fastify';
import { ApiError } from './api-error.js';

export function queryParams(url: string): URLSearchParams {
  // PHP query parsing retains the last value of repeated scalar keys.
  return new URLSearchParams(Object.fromEntries(new URL(url, 'http://localhost').searchParams));
}

export function body(request: FastifyRequest): Record<string, unknown> {
  let value: unknown;
  try { value = JSON.parse(String(request.body ?? '')); }
  catch { throw new ApiError(400, ['Bad Request']); }
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function capture(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (value === undefined) throw new Error('Missing route capture');
  return value;
}
