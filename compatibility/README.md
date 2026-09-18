# Backend compatibility probes

Baseline: `73b3cca2` (clean working tree). The PHP implementation is the reference.

Use `docker compose -p jira-logger-compatibility -f compatibility/compose.yml up -d --wait`
to start the disposable PostgreSQL 13 instance. It uses tmpfs, a distinct project,
and a loopback-only port. Never point write probes at the deployed application.

The PHP router refuses any database URL outside this fixture instance. Run it
with `DATABASE_URL=postgresql://compatibility:disposable@127.0.0.1:55439/compatibility`,
`APP_ENV=prod`, `APP_SECRET=compatibility`, `APP_INTERNAL_TIMEZONE=UTC`,
`APP_DEFAULT_USER_TIMEZONE=Europe/Riga`, and `CORS_ALLOW_ORIGIN=^https?://localhost$`.
Start PHP with `php -S 127.0.0.1:18081 compatibility/php-router.php`.

The historical frontend baseline is 553 passing tests and one timezone-sensitive
failure; the isolated case passed with Europe/Riga. This is historical evidence,
not an executed rewrite validation.
