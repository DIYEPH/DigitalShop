# Build from the repo root (bundles bot_binance_pay for BotRunnerManager):
#   docker build -f backend-bot/Dockerfile .
FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend-bot/package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend-bot/ .
RUN npm run build && npm prune --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim AS runner-deps

WORKDIR /runner

COPY bot_binance_pay/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY backend-bot/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Bot runner: BotRunnerManager starts bot-runner/src/bot.js per ACTIVE shop.
COPY bot_binance_pay/package.json ./bot-runner/package.json
COPY --from=runner-deps /runner/node_modules ./bot-runner/node_modules
COPY bot_binance_pay/src ./bot-runner/src
ENV BOT_RUNNER_DIR=/app/bot-runner

USER node
EXPOSE 3001

CMD ["npm", "run", "start:prod"]
