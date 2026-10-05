FROM node:24.15-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24.15-alpine AS backend-build
WORKDIR /app
COPY backend-node/package*.json ./
RUN npm ci
COPY backend-node/tsconfig.json ./
COPY backend-node/src ./src
COPY backend-node/scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:24.15-alpine
RUN apk add --no-cache su-exec && mkdir -p /data && chown node:node /data && chmod 700 /data
ENV NODE_ENV=production SQLITE_PATH=/data/jira-logger.sqlite ASSETS_PATH=/app/public/ng
WORKDIR /app
COPY --from=backend-build --chown=node:node /app/package*.json ./
COPY --from=backend-build --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /app/dist ./dist
COPY --from=frontend-build --chown=node:node /frontend/dist/jira-logger/browser/ ./public/ng/
COPY .docker/node/docker-entrypoint.sh /usr/local/bin/node-entrypoint
ENTRYPOINT ["sh", "/usr/local/bin/node-entrypoint"]
EXPOSE 3000
CMD ["node", "dist/server.js"]
