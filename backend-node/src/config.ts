export function databaseUrl(value: string): string {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL URL required');
  url.searchParams.delete('serverVersion');
  url.searchParams.delete('charset');
  return url.toString();
}

export const config = {
  database: databaseUrl(process.env.DATABASE_URL ?? 'postgresql://localhost/jira_logger'),
  internalTimezone: process.env.APP_INTERNAL_TIMEZONE ?? 'UTC',
  userTimezone: process.env.APP_DEFAULT_USER_TIMEZONE ?? 'Europe/Riga',
  port: Number(process.env.PORT ?? 3000),
  assets: process.env.ASSETS_PATH ?? '/var/www/public/ng',
  corsOrigin: process.env.CORS_ALLOW_ORIGIN ?? '^https?://localhost$',
};
