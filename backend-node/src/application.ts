import { JiraClient } from './jira-client.js';
import { JiraWorkLogsRepository } from './jira-work-logs.repository.js';
import { TimersRepository } from './timers.repository.js';
import { DateCodec, TimezoneService } from './dates.js';
import { TasksRepository } from './tasks.repository.js';
import { ResponseMapper } from './projections.js';
import { ReportService } from './reports.js';
import { SettingsRepository } from './settings.repository.js';
import { TagsRepository } from './tags.repository.js';
import { SettingsController, SettingsService } from './settings.js';
import { TagsController, TagsService } from './tags.js';
import { TasksController, TasksService } from './tasks.js';
import { TimersController, TimersService } from './timers.js';
import { JiraController, JiraService } from './jira.js';
import { JiraWorkLogsController, JiraWorkLogsService } from './jira-work-logs.js';
import { Configuration } from './config.js';
import { Database, createPool } from './db.js';
import type { JiraTransport } from './jira-client.js';
import { MigrationRepository } from './migrations.js';
import { MaintenanceRepository } from './maintenance.repository.js';
import { MaintenanceService } from './maintenance.js';
import type { Route } from './http.js';

export interface ApplicationResources { database?: Database; jira?: JiraTransport; }
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
