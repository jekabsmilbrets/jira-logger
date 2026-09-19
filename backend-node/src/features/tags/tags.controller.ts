import { uuid } from '../../http/http.constants.js';
import type { Route } from '../../http/http.types.js';
import { body, capture } from '../../http/request.helpers.js';
import { envelope } from '../../http/response.helpers.js';
import { TagsService } from './tags.service.js';

export class TagsController {
  constructor(private readonly service: TagsService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/tag$/, methods: {
          GET: async () => envelope(await this.service.list()),
          POST: async request => envelope(await this.service.save(body(request))),
        }
      },
      {
        path: new RegExp(`^/api/tag/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
