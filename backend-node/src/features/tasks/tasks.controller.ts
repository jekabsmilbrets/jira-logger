import { uuid } from '../../http/http.constants.js';
import type { Route } from '../../http/http.types.js';
import { body, capture, queryParams } from '../../http/request.helpers.js';
import { envelope } from '../../http/response.helpers.js';
import type { ReportService } from './report.service.js';
import { TasksService } from './tasks.service.js';

export class TasksController {
  constructor(private readonly service: TasksService, private readonly reports: ReportService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/task$/, methods: {
          GET: async request => envelope(await this.reports.list(queryParams(request.url))),
          POST: async request => envelope(await this.service.save(body(request))),
        }
      },
      {
        path: /^\/api\/task\/exist\/(.+)$/, methods: {
          GET: async (_request, reply, match) => reply.code(await this.service.exists(decodeURIComponent(capture(match, 1)).trim()) ? 409 : 204).send([]),
        }
      },
      {
        path: new RegExp(`^/api/task/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
