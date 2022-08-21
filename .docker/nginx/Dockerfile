FROM nginx:alpine

RUN apk update && \
    apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 \
      -subj "/C=CA/ST=QC/O=Company, Inc./CN=jira-logger.io" \
      -addext "subjectAltName=DNS:jira-logger.io" -newkey rsa:2048  \
      -keyout /etc/ssl/private/nginx-selfsigned.key  \
      -out /etc/ssl/certs/nginx-selfsigned.crt;

WORKDIR /var/www

CMD ["nginx"]

EXPOSE 80 443
