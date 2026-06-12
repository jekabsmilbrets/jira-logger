FROM nginx:1.27-alpine
WORKDIR /var/www

COPY .docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY .docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY .docker/nginx/sites/ /etc/nginx/sites-available/

COPY backend/public/ /var/www/public/

RUN chmod -R a+rX /var/www/public

EXPOSE 80 443
