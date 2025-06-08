FROM php:8.4-fpm

RUN apt-get update && \
    apt-get install -y --no-install-recommends libssl-dev zlib1g-dev curl git unzip netcat-traditional libxml2-dev libpq-dev libzip-dev && \
    pecl install apcu && \
    docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql && \
    docker-php-ext-install -j$(nproc) zip opcache intl pdo_pgsql pgsql && \
    docker-php-ext-enable apcu pdo_pgsql sodium && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*


COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

CMD ["sh", "-c", "composer i -o && (php bin/console doctrine:database:create --no-interaction || true) && php bin/console doctrine:migrations:migrate --no-interaction && php bin/console seed:load && php bin/console c:c && php-fpm"]

EXPOSE 9000
