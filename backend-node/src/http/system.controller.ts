import { DateTime }              from 'luxon';

import { documentation } from '@http/documentation.constants';
import type { Route }    from '@http/http.types';
import { envelope }      from '@http/response.helpers';

import type { TimezoneProvider } from '@time/time.types';


export class SystemController {
  constructor(
    private readonly timezone: TimezoneProvider,
  ) {
  }

  public routes(): Route[] {
    return [
      {
        path: /^\/api\/doc$/,
        methods: {
          GET: async (
            _request,
            reply,
          ) => reply.type('text/html; charset=UTF-8').send(documentation)
        }
      },
      {
        path: /^\/api\/monitor$/,
        methods: {
          GET: async () => envelope({
            time: DateTime.now().setZone(await this.timezone.userTimezone()).toFormat('yyyy-MM-dd\'T\'HH:mm:ssZZ'),
            message: 'Welcome to Jira-logger API!'
          })
        }
      }
    ];
  }
}
