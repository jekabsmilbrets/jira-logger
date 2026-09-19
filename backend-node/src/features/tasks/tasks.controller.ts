import type { ReportService } from '@features/tasks/report.service';
import { TasksService }       from '@features/tasks/tasks.service';

import { uuid }                       from '@http/http.constants';
import type { Route }                 from '@http/http.types';
import { body, capture, queryParams } from '@http/request.helpers';
import { envelope }                   from '@http/response.helpers';


export class TasksController {
  constructor(
    private readonly service: TasksService,
    private readonly reports: ReportService,
  ) {
  }

  public routes(): Route[] {
    return [
      {
        path: /^\/api\/task$/,
        methods: {
          GET: async (
            request,
          ) => envelope(await this.reports.list(queryParams(request.url))),
          POST: async (
            request,
          ) => envelope(await this.service.save(body(request)))
        }
      },
      {
        path: /^\/api\/task\/exist\/(.+)$/,
        methods: {
          GET: async (
            _request,
            reply,
            match,
          ) => reply.code(await this.service.exists(decodeURIComponent(capture(match, 1)).trim()) ? 409 : 204).send([])
        }
      },
      {
        path: new RegExp(`^/api/task/(${ uuid })$`),
        methods: {
          GET: async (
            _request,
            _reply,
            match,
          ) => envelope(await this.service.show(capture(match, 1))),
          PATCH: async (
            request,
            _reply,
            match,
          ) => envelope(await this.service.save(body(request), capture(match, 1))),
          DELETE: async (
            _request,
            reply,
            match,
          ) => {
            await this.service.delete(capture(match, 1));

            return reply.code(204).send();
          }
        }
      }
    ];
  }
}
