# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY backend-bot/package.json backend-bot/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend-bot/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend-bot/package.json backend-bot/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY backend-bot/init.sql ./init.sql
COPY backend-bot/scripts ./scripts

EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
