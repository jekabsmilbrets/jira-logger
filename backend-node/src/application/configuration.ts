export function databaseUrl(
  value: string,
): string {
  const url: URL = new URL(value);

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('PostgreSQL URL required');
  }

  url.searchParams.delete('serverVersion');
  url.searchParams.delete('charset');

  return url.toString();
}

export class Configuration {
  public readonly database: string;
  public readonly internalTimezone: string;
  public readonly userTimezone: string;
  public readonly port: number;
  public readonly assets: string;
  public readonly corsOrigin: string;
  public readonly logFile: string | undefined;
  public readonly tlsCertificate: string | undefined;
  public readonly tlsKey: string | undefined;
  public readonly healthPort: number;

  constructor(
    environment: NodeJS.ProcessEnv = process.env,
  ) {
    this.database = databaseUrl(environment.DATABASE_URL ?? 'postgresql://localhost/jira_logger');
    this.internalTimezone = environment.APP_INTERNAL_TIMEZONE ?? 'UTC';
    this.userTimezone = environment.APP_DEFAULT_USER_TIMEZONE ?? 'Europe/Riga';
    this.port = Number(environment.PORT ?? 3000);
    this.assets = environment.ASSETS_PATH ?? '/var/www/public/ng';
    this.corsOrigin = environment.CORS_ALLOW_ORIGIN ?? '^https?://localhost$';
    this.logFile = environment.LOG_FILE;
    this.tlsCertificate = environment.TLS_CERT_FILE;
    this.tlsKey = environment.TLS_KEY_FILE;
    this.healthPort = Number(environment.HEALTH_PORT ?? 3001);

    if (Boolean(this.tlsCertificate) !== Boolean(this.tlsKey)) {
      throw new Error('Both TLS_CERT_FILE and TLS_KEY_FILE are required for HTTPS');
    }
  }
}
