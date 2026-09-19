import { Database } from '../database/database.js';
import { createPool } from '../database/postgres-pool.js';
import { JiraWorkLogsController } from '../features/jira-work-logs/jira-work-logs.controller.js';
import { JiraWorkLogsRepository } from '../features/jira-work-logs/jira-work-logs.repository.js';
import { JiraWorkLogsService } from '../features/jira-work-logs/jira-work-logs.service.js';
import { JiraClient } from '../features/jira/jira-client.js';
import { JiraController } from '../features/jira/jira.controller.js';
import { JiraService } from '../features/jira/jira.service.js';
import type { JiraTransport } from '../features/jira/jira.types.js';
import { MaintenanceRepository } from '../features/maintenance/maintenance.repository.js';
import { MaintenanceService } from '../features/maintenance/maintenance.service.js';
import { MigrationRepository } from '../features/maintenance/migration.repository.js';
import { SettingsController } from '../features/settings/settings.controller.js';
import { SettingsRepository } from '../features/settings/settings.repository.js';
import { SettingsService } from '../features/settings/settings.service.js';
import { TagsController } from '../features/tags/tags.controller.js';
import { TagsRepository } from '../features/tags/tags.repository.js';
import { TagsService } from '../features/tags/tags.service.js';
import { ReportService } from '../features/tasks/report.service.js';
import { TasksController } from '../features/tasks/tasks.controller.js';
import { TasksRepository } from '../features/tasks/tasks.repository.js';
import { TasksService } from '../features/tasks/tasks.service.js';
import { TimersController } from '../features/timers/timers.controller.js';
import { TimersRepository } from '../features/timers/timers.repository.js';
import { TimersService } from '../features/timers/timers.service.js';
import type { Route } from '../http/http.types.js';
import { SystemController } from '../http/system.controller.js';
import { ResponseMapper } from '../shared/response-mapper.js';
import { DateCodec } from '../time/date-codec.js';
import { TimezoneService } from '../time/timezone.service.js';
import type { ApplicationResources } from './application.types.js';
import { Configuration } from './configuration.js';

export class Application {
  private readonly database: Database;
  private readonly settings: SettingsRepository;
  readonly timezone: TimezoneService;
  readonly maintenance: MaintenanceService;
  private jiraClient: JiraTransport | undefined;
  private routeRegistry: Route[] | undefined;
  private closePromise: Promise<void> | undefined;

  constructor(readonly config: Configuration = new Configuration(), resources: ApplicationResources = {}) {
    this.database = resources.database ?? new Database(createPool(config.database));
    this.settings = new SettingsRepository(this.database);
    this.timezone = new TimezoneService(this.settings, config.userTimezone);
    this.jiraClient = resources.jira;
    this.maintenance = new MaintenanceService(new MaintenanceRepository(this.database, config.database), new MigrationRepository(this.database));
  }
  routes(): Route[] {
    if (this.closePromise) throw new Error('Application is closed');
    if (this.routeRegistry) return this.routeRegistry;
    const dates = new DateCodec(this.config.internalTimezone);
    const mapper = new ResponseMapper(dates);
    const tags = new TagsRepository(this.database);
    const tasksRepository = new TasksRepository(this.database);
    const timers = new TimersRepository(this.database);
    const logs = new JiraWorkLogsRepository(this.database);
    const tasks = new TasksService(tasksRepository, tags, this.timezone, mapper);
    this.jiraClient ??= new JiraClient(this.settings);
    this.routeRegistry = [
      ...new SettingsController(new SettingsService(this.settings)).routes(),
      ...new TagsController(new TagsService(tags, this.timezone, mapper)).routes(),
      ...new TasksController(tasks, new ReportService(tasksRepository, tasks, this.timezone)).routes(),
      ...new TimersController(new TimersService(timers, tasks, this.timezone, dates, mapper)).routes(),
      ...new JiraController(new JiraService(tasks, tasksRepository, timers, logs, this.timezone, dates, this.jiraClient)).routes(),
      ...new JiraWorkLogsController(new JiraWorkLogsService(logs, tasksRepository, this.timezone, mapper)).routes(),
      ...new SystemController(this.timezone).routes(),
    ];
    return this.routeRegistry;
  }
  async ready(): Promise<void> { await this.database.ping(); }
  close(): Promise<void> {
    this.closePromise ??= Promise.allSettled([this.database.end(), this.jiraClient?.close()]).then(results => {
      const errors = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected').map(result => result.reason);
      if (errors.length) throw new AggregateError(errors, 'Application cleanup failed');
    });
    return this.closePromise;
  }
}
