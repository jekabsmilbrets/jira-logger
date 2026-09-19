import type { FastifyReply, FastifyRequest } from 'fastify';

export type Handler = (request: FastifyRequest, reply: FastifyReply, match: RegExpMatchArray) => Promise<unknown>;

export type Route = { path: RegExp; methods: Record<string, Handler> };

export interface ReadinessProbe { ready(): Promise<void>; }
