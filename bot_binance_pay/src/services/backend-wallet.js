const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function createBinanceTopup({ telegramId, amount }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/wallet/telegram/topup/binance', {
    telegram_id: telegramId,
    amount,
  });
  return response?.data?.data ?? null;
}

async function createBankTopup({ telegramId, amount }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/wallet/telegram/topup/bank', {
    telegram_id: telegramId,
    amount: Math.round(amount),
  });
  return response?.data?.data ?? null;
}

async function getTopupStatus({ telegramId, topupId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get(`/api/wallet/telegram/topup/${topupId}/status`, {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data ?? null;
}

async function cancelTopup({ telegramId, topupId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post(`/api/wallet/telegram/topup/${topupId}/cancel`, {
    telegram_id: telegramId,
  });
  return response?.data?.data ?? null;
}

module.exports = { createBinanceTopup, createBankTopup, getTopupStatus, cancelTopup };
