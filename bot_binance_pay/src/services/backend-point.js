const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function getDailyStatus(telegramId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get('/api/point/telegram/daily', {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data || null;
}

async function claimDaily(telegramId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/point/telegram/daily/claim', {
    telegram_id: telegramId,
  });
  return response?.data?.data || null;
}

module.exports = {
  getDailyStatus,
  claimDaily,
};
