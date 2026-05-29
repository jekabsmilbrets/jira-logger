FROM php:8.4-fpm

# System deps (intl, zip, pgsql, sodium, XML, etc.)
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
        curl \
        git \
        unzip \
        netcat-traditional \
        pkg-config \
    ; \
    rm -rf /var/lib/apt/lists/*

# Extensions
# - apcu from PECL
# - intl requires libicu-dev
# - zip requires libzip-dev + zlib
# - pgsql/pdo_pgsql require libpq-dev
# - sodium requires libsodium-dev
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

# (Optional) opcache is enabled by docker-php-ext-install; harmless to leave as-is
# RUN docker-php-ext-enable opcache

# Bring in Composer (pin to v2)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Start-up script (runs Composer + migrations, then php-fpm)
CMD ["sh", "-c", "composer i -o && (php bin/console doctrine:database:create --no-interaction || true) && php bin/console doctrine:migrations:migrate --no-interaction && php bin/console seed:load && php bin/console c:c && php-fpm"]

EXPOSE 9000
