const { Telegraf } = require('telegraf');
const config = require('./config');
const { isBackendEnabled } = require('./services/backend-client');
const { extractErrorMessage } = require('./handlers/error-middleware');
const commandHandlers = require('./handlers/commands');
const callbackHandlers = require('./handlers/callbacks');
const messageHandlers = require('./handlers/messages');

async function startBot() {
  if (!isBackendEnabled()) {
    console.error('BACKEND_API_BASE_URL and BACKEND_BOT_SECRET are required');
    process.exit(1);
  }

  console.log('Starting bot...');

  const bot = new Telegraf(config.BOT_TOKEN);

  bot.catch((err, ctx) => {
    const userId = ctx?.from?.id;
    const message = extractErrorMessage(err, userId);
    console.error('Bot error:', err?.message || err);
    if (ctx?.callbackQuery) {
      ctx.answerCbQuery(message.slice(0, 180)).catch(() => {});
    }
    if (ctx?.chat) {
      ctx.reply(`❌ ${message}`).catch(() => {});
    }
  });

  commandHandlers.register(bot);
  callbackHandlers.register(bot);
  messageHandlers.register(bot);

  bot.launch().catch((err) => console.error('Launch error:', err.message));

  await waitForBotInfo(bot);
  console.log(`Bot @${bot.botInfo?.username || 'unknown'} for "${config.SHOP_NAME}" is running`);

  registerCommands(bot).catch(() => {});

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

async function waitForBotInfo(bot, timeoutMs = 30000) {
  const start = Date.now();
  while (!bot.botInfo && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!bot.botInfo) console.warn('⚠️ Could not get bot info within timeout');
}

async function registerCommands(bot) {
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Start / 开始 / Bắt đầu' },
    { command: 'balance', description: 'Balance / 余额 / Số dư' },
    { command: 'daily', description: 'Daily check-in / 签到 / Điểm danh' },
    { command: 'referral', description: 'Referral / 邀请 / Giới thiệu' },
    { command: 'history', description: 'History / 历史 / Lịch sử' },
    { command: 'lang', description: 'Language / 语言 / Ngôn ngữ' },
  ]);
}

startBot().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
