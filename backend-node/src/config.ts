export function databaseUrl(value: string): string {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL URL required');
  url.searchParams.delete('serverVersion');
  url.searchParams.delete('charset');
  return url.toString();
}

export class Configuration {
  readonly database: string;
  readonly internalTimezone: string;
  readonly userTimezone: string;
  readonly port: number;
  readonly assets: string;
  readonly corsOrigin: string;
  readonly logFile: string | undefined;

  constructor(environment: NodeJS.ProcessEnv = process.env) {
    this.database = databaseUrl(environment.DATABASE_URL ?? 'postgresql://localhost/jira_logger');
    this.internalTimezone = environment.APP_INTERNAL_TIMEZONE ?? 'UTC';
    this.userTimezone = environment.APP_DEFAULT_USER_TIMEZONE ?? 'Europe/Riga';
    this.port = Number(environment.PORT ?? 3000);
    this.assets = environment.ASSETS_PATH ?? '/var/www/public/ng';
    this.corsOrigin = environment.CORS_ALLOW_ORIGIN ?? '^https?://localhost$';
    this.logFile = environment.LOG_FILE;
  }
}
