FROM composer:2.8 AS composer_deps
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.4-fpm-bookworm

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        libicu-dev \
        libzip-dev \
        zlib1g-dev \
        libpq-dev \
        libxml2-dev \
        libssl-dev \
        libsodium-dev \
        unzip \
        pkg-config \
    ; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    pecl install apcu; \
    docker-php-ext-enable apcu; \
    docker-php-ext-configure intl; \
    docker-php-ext-install -j"$(nproc)" \
        intl \
        zip \
        opcache \
        pdo_pgsql \
        pgsql \
        sodium

WORKDIR /var/www

COPY backend/ ./
COPY --from=composer_deps /app/vendor ./vendor
COPY .docker/php-fpm/docker-entrypoint.sh /usr/local/bin/php-fpm-entrypoint.sh
COPY .docker/php-fpm/zz-logging.conf /usr/local/etc/php-fpm.d/zz-logging.conf
COPY .docker/php-fpm/zz-php-log.ini /usr/local/etc/php/conf.d/zz-php-log.ini

RUN chmod +x /usr/local/bin/php-fpm-entrypoint.sh \
    && chmod -R a+rX /var/www

ENTRYPOINT ["/usr/local/bin/php-fpm-entrypoint.sh"]
CMD ["php-fpm"]

EXPOSE 9000
