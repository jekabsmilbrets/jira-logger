FROM node:24-alpine AS builder
WORKDIR /app
COPY backend-node/package*.json ./
RUN npm ci
COPY backend-node/tsconfig.json ./
COPY backend-node/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
