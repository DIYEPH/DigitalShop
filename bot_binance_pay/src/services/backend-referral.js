const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function getMe(telegramId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get('/api/referral/telegram/me', {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data || null;
}

async function bind(telegramId, code) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/referral/telegram/bind', {
    telegram_id: telegramId,
    code,
  });
  return response?.data?.data || null;
}

module.exports = {
  getMe,
  bind,
};
