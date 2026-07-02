require('dotenv').config();

// Per-shop values are injected by backend-bot's BotRunnerManager;
// sellers configure them in the admin panel.
module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  BOT_USERNAME: process.env.BOT_USERNAME || '',
  SHOP_NAME: process.env.SHOP_NAME || 'Shop Bot',
  // Shop support link ("Contact admin" button).
  SUPPORT_URL: process.env.SUPPORT_URL || '',
  // UI hint only; the backend enforces actual payment availability.
  BANK_ENABLED: process.env.BANK_ENABLED !== 'false',
  // Must match backend MIN_BANK_TOPUP_VND.
  MIN_BANK_TOPUP_VND: 10000,
  BACKEND_API_BASE_URL: process.env.BACKEND_API_BASE_URL || '',
  BACKEND_BOT_SECRET: process.env.BACKEND_BOT_SECRET || '',
  BACKEND_REQUEST_TIMEOUT_MS: parseInt(process.env.BACKEND_REQUEST_TIMEOUT_MS || '8000', 10)
};
