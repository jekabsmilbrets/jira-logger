#!/bin/sh
set -e

APP_ENV_VALUE="${APP_ENV:-prod}"

mkdir -p /var/www/var/log/"${APP_ENV_VALUE}" /var/log/php-fpm
touch \
  /var/log/php-fpm/log-php-fpm-error.log \
  /var/log/php-fpm/log-php-fpm-access.log \
  /var/log/php-fpm/log-php-fpm-slow.log \
  /var/www/var/log/log-symfony-main.log \
  /var/www/var/log/log-symfony-deprecation.log \
  /var/www/var/log/log-symfony-jira-api-service.log
chmod -R a+rwX /var/www/var/log /var/log/php-fpm || true

if [ -f /var/www/bin/console ]; then
  echo "Clearing Symfony cache (env=${APP_ENV_VALUE})"
  php /var/www/bin/console cache:clear --no-warmup --env="${APP_ENV_VALUE}" || true
  echo "Warming Symfony cache (env=${APP_ENV_VALUE})"
  php /var/www/bin/console cache:warmup --env="${APP_ENV_VALUE}" || true
fi

exec "$@"
