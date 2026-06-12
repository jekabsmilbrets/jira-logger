FROM composer:2.8 AS composer_binary

FROM php:8.5-cli-bookworm AS composer_deps
WORKDIR /app
COPY --from=composer_binary /usr/bin/composer /usr/bin/composer
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        git \
        unzip \
    ; \
    rm -rf /var/lib/apt/lists/*
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.5-fpm-bookworm

ARG APCU_VERSION=5.1.28

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        $PHPIZE_DEPS \
        ca-certificates \
        curl \
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
    curl -fsSL "https://github.com/krakjoe/apcu/archive/refs/tags/v${APCU_VERSION}.tar.gz" -o /tmp/apcu.tar.gz; \
    mkdir -p /usr/src/php/ext/apcu; \
    tar -xzf /tmp/apcu.tar.gz --strip-components=1 -C /usr/src/php/ext/apcu; \
    rm -f /tmp/apcu.tar.gz; \
    docker-php-ext-configure intl; \
    docker-php-ext-install -j"$(nproc)" \
        apcu \
        intl \
        zip \
        pdo_pgsql \
        pgsql; \
    docker-php-ext-enable apcu

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
