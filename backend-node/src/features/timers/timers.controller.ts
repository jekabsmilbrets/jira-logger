import { uuid } from '../../http/http.constants.js';
import type { Route } from '../../http/http.types.js';
import { body, capture } from '../../http/request.helpers.js';
import { envelope } from '../../http/response.helpers.js';
import { TimersService } from './timers.service.js';

export class TimersController {
  constructor(private readonly service: TimersService) { }
  routes(): Route[] {
    return [
      {
        path: new RegExp(`^/api/task/(${uuid})/time-log$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.list(capture(match, 1))),
          POST: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
        }
      },
      { path: /^\/api\/task\/([^/]+)\/time-log$/, methods: { POST: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))) } },
      {
        path: new RegExp(`^/api/task/([^/]+)/time-log/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1), capture(match, 2))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1), capture(match, 2))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1), capture(match, 2)); return reply.code(204).send(); },
        }
      },
      {
        path: /^\/api\/task\/([^/]+)\/time-log\/(start|stop)$/, methods: {
          POST: async (_request, reply, match) => await this.service.changeRunning(capture(match, 1), capture(match, 2)) ? reply.code(204).send() : reply.code(409).send([]),
        }
      },
      { path: /^\/api\/task\/active$/, methods: { GET: async () => envelope(await this.service.active()) } },
      { path: /^\/api\/task\/today\/seconds$/, methods: { GET: async () => envelope(await this.service.today()) } },
    ];
  }
}
