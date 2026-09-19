import { uuid } from '../../http/http.constants.js';
import type { Route } from '../../http/http.types.js';
import { body, capture } from '../../http/request.helpers.js';
import { envelope } from '../../http/response.helpers.js';
import { SettingsService } from './settings.service.js';

export class SettingsController {
  constructor(private readonly service: SettingsService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/setting$/, methods: {
          GET: async () => envelope(await this.service.list()),
          POST: async request => envelope(await this.service.save(body(request))),
        }
      },
      {
        path: new RegExp(`^/api/setting/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
