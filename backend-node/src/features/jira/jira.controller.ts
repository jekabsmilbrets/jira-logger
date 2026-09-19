import { JiraService }           from '@features/jira/jira.service';
import type { JiraSearchResult } from '@features/jira/jira.types';

import { uuid }                 from '@http/http.constants';
import type { Route }           from '@http/http.types';
import { capture, queryParams } from '@http/request.helpers';
import { envelope }             from '@http/response.helpers';


export class JiraController {
  constructor(
    private readonly service: JiraService,
  ) {
  }

  public routes(): Route[] {
    return [
      {
        path: /^\/api\/task\/jira\/missing$/,
        methods: {
          GET: async (
            request,
          ) => {
            const result: JiraSearchResult = await this.service.missing(queryParams(request.url));

            return envelope(result.issues, undefined, result.meta);
          }
        }
      },
      {
        path: new RegExp(`^/api/task/(${ uuid })/([0-9]{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|(?<!02-)3[01]))$`),
        methods: {
          POST: async (
            _request,
            reply,
            match,
          ) => {
            await this.service.sync(capture(match, 1), capture(match, 2));

            return reply.code(204).send();
          }
        }
      }
    ];
  }
}
