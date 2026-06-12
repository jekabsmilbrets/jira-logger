FROM node:22-bookworm-slim AS frontend_build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM debian:bookworm-slim
WORKDIR /work
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates coreutils \
    && rm -rf /var/lib/apt/lists/*
COPY --from=frontend_build /app/dist/jira-logger/browser/ /work/ng/
COPY .docker/assets-init/assets-init.sh /usr/local/bin/assets-init.sh
RUN chmod +x /usr/local/bin/assets-init.sh
ENTRYPOINT ["/usr/local/bin/assets-init.sh"]
