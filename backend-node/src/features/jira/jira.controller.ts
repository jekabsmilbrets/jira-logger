import { uuid } from '../../http/http.constants.js';
import type { Route } from '../../http/http.types.js';
import { capture, queryParams } from '../../http/request.helpers.js';
import { envelope } from '../../http/response.helpers.js';
import { JiraService } from './jira.service.js';

export class JiraController {
  constructor(private readonly service: JiraService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/task\/jira\/missing$/, methods: {
          GET: async request => {
            const result = await this.service.missing(queryParams(request.url));
            return envelope(result.issues, undefined, result.meta);
          }
        }
      },
      {
        path: new RegExp(`^/api/task/(${uuid})/([0-9]{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|(?<!02-)3[01]))$`), methods: {
          POST: async (_request, reply, match) => { await this.service.sync(capture(match, 1), capture(match, 2)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
