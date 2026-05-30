FROM nginx:1.27-alpine
WORKDIR /var/www

COPY .docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY .docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY .docker/nginx/sites/ /etc/nginx/sites-available/
COPY .docker/nginx/docker-entrypoint.d/ /docker-entrypoint.d/

COPY backend/public/ /var/www/public/

RUN chmod +x /docker-entrypoint.d/30-runtime-config.sh \
    && chmod -R a+rX /var/www/public

EXPOSE 80 443
