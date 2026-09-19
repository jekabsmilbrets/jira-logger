import { DateTime } from 'luxon';
import type { TimezoneProvider } from '../time/time.types.js';
import { documentation } from './documentation.constants.js';
import type { Route } from './http.types.js';
import { envelope } from './response.helpers.js';

export class SystemController {
  constructor(private readonly timezone: TimezoneProvider) { }

  routes(): Route[] {
    return [
      { path: /^\/api\/doc$/, methods: { GET: async (_request, reply) => reply.type('text/html; charset=UTF-8').send(documentation) } },
      { path: /^\/api\/monitor$/, methods: { GET: async () => envelope({ time: DateTime.now().setZone(await this.timezone.userTimezone()).toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"), message: 'Welcome to Jira-logger API!' }) } },
    ];
  }
}
