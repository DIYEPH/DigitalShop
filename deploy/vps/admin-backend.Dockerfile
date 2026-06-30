# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY admin-backend/package.json admin-backend/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY admin-backend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY admin-backend/package.json admin-backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
