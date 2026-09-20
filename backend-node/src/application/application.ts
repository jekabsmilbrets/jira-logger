import type { ApplicationResources } from '@application/application.types';
import { Configuration }             from '@application/configuration';

import { Database }               from '@database/database';
import { createPool }             from '@database/postgres-pool';

import { JiraController }        from '@features/jira/jira.controller';
import { JiraService }           from '@features/jira/jira.service';
import type { JiraTransport }    from '@features/jira/jira.types';
import { JiraClient }             from '@features/jira/jira-client';
import { JiraWorkLogsController } from '@features/jira-work-logs/jira-work-logs.controller';
import { JiraWorkLogsRepository } from '@features/jira-work-logs/jira-work-logs.repository';
import { JiraWorkLogsService }    from '@features/jira-work-logs/jira-work-logs.service';
import { MaintenanceRepository } from '@features/maintenance/maintenance.repository';
import { MaintenanceService }    from '@features/maintenance/maintenance.service';
import { MigrationRepository }   from '@features/maintenance/migration.repository';
import { SettingsController }    from '@features/settings/settings.controller';
import { SettingsRepository }    from '@features/settings/settings.repository';
import { SettingsService }       from '@features/settings/settings.service';
import { TagsController }        from '@features/tags/tags.controller';
import { TagsRepository }        from '@features/tags/tags.repository';
import { TagsService }           from '@features/tags/tags.service';
import { ReportService }         from '@features/tasks/report.service';
import { TasksController }       from '@features/tasks/tasks.controller';
import { TasksRepository }       from '@features/tasks/tasks.repository';
import { TasksService }          from '@features/tasks/tasks.service';
import { TimersController }      from '@features/timers/timers.controller';
import { TimersRepository }      from '@features/timers/timers.repository';
import { TimersService }         from '@features/timers/timers.service';

import type { Route }       from '@http/http.types';
import { SystemController } from '@http/system.controller';

import { ResponseMapper } from '@shared/response-mapper';

import { DateCodec }       from '@time/date-codec';
import { TimezoneService } from '@time/timezone.service';


export class Application {
  private readonly database: Database;
  private readonly settings: SettingsRepository;
  public readonly timezone: TimezoneService;
  public readonly maintenance: MaintenanceService;
  private jiraClient: JiraTransport | undefined;
  private routeRegistry: Route[] | undefined;
  private closePromise: Promise<void> | undefined;

  constructor(
    public readonly config: Configuration = new Configuration(),
    resources: ApplicationResources       = {},
  ) {
    this.database = resources.database ?? new Database(createPool(config.database));
    this.settings = new SettingsRepository(this.database);
    this.timezone = new TimezoneService(this.settings, config.userTimezone);
    this.jiraClient = resources.jira;
    this.maintenance = new MaintenanceService(new MaintenanceRepository(this.database, config.database), new MigrationRepository(this.database));
  }

  public routes(): Route[] {
    if (this.closePromise) {
      throw new Error('Application is closed');
    }

    if (this.routeRegistry) {
      return this.routeRegistry;
    }

    const dates: DateCodec = new DateCodec(this.config.internalTimezone);
    const mapper: ResponseMapper = new ResponseMapper(dates);
    const tags: TagsRepository = new TagsRepository(this.database);
    const tasksRepository: TasksRepository = new TasksRepository(this.database);
    const timers: TimersRepository = new TimersRepository(this.database);
    const logs: JiraWorkLogsRepository = new JiraWorkLogsRepository(this.database);
    const tasks: TasksService = new TasksService(tasksRepository, tags, this.timezone, mapper);
    this.jiraClient ??= new JiraClient(this.settings);
    this.routeRegistry = [
      ...new SettingsController(new SettingsService(this.settings)).routes(),
      ...new TagsController(new TagsService(tags, this.timezone, mapper)).routes(),
      ...new TasksController(tasks, new ReportService(tasksRepository, tasks, this.timezone)).routes(),
      ...new TimersController(new TimersService(timers, tasks, this.timezone, dates, mapper)).routes(),
      ...new JiraController(new JiraService(tasks, tasksRepository, timers, logs, this.timezone, dates, this.jiraClient)).routes(),
      ...new JiraWorkLogsController(new JiraWorkLogsService(logs, tasksRepository, this.timezone, mapper)).routes(),
      ...new SystemController(this.timezone).routes()
    ];

    return this.routeRegistry;
  }

  public async ready(): Promise<void> {
    await this.database.ping();
  }

  public close(): Promise<void> {
    this.closePromise ??= Promise.allSettled([this.database.end(), this.jiraClient?.close()]).then(
      (
        results,
      ) => {
        const errors: unknown[] = results.filter((
          result,
        ): result is PromiseRejectedResult => result.status === 'rejected').map(
          (
            result,
          ) => result.reason,
        );

        if (errors.length) {
          throw new AggregateError(errors, 'Application cleanup failed');
        }
      });

    return this.closePromise;
  }
}
