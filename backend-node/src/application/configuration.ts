import { resolve } from 'node:path';


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
    this.database = environment.SQLITE_PATH ?? './data/jira-logger.sqlite';

    if (!this.database.trim() || this.database.includes('://')) {
      throw new Error('SQLite file path required');
    }

    this.internalTimezone = environment.APP_INTERNAL_TIMEZONE ?? 'UTC';
    this.userTimezone = environment.APP_DEFAULT_USER_TIMEZONE ?? 'Europe/Riga';
    this.port = Number(environment.PORT ?? 3000);
    this.assets = resolve(environment.ASSETS_PATH ?? './public/ng');
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
