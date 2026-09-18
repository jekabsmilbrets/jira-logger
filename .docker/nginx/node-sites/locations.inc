root /var/www/public;
location = /internal/ready {
    return 404;
}
location /ng/ {
    try_files $uri =404;
}
location ~ \.php(?:/|$) {
    return 404;
}
location / {
    proxy_pass http://node-upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 130s;
}
