import type { FastifyReply, FastifyRequest } from 'fastify';


export type Handler = (
  request: FastifyRequest,
  reply: FastifyReply,
  match: RegExpMatchArray,
) => Promise<unknown>;

export interface Route {
  path: RegExp;
  methods: Record<string, Handler>
}

export interface ReadinessProbe {
  ready(): Promise<void>;
}

export interface AcceptedMediaType {
  type: string | undefined;
  quality: number;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
}
