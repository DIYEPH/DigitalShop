const { createBackendClient, isBackendEnabled } = require('./backend-client');

function normalizeLanguage(lang) {
  const normalized = String(lang || '').trim().toLowerCase();
  if (['en', 'vi', 'ru', 'zh'].includes(normalized)) return normalized;
  return null;
}

async function telegramLogin({ telegramId, username, fullName }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/auth/telegram/login', {
    telegram_id: telegramId,
    username,
    full_name: fullName,
  });
  return response?.data?.data || null;
}

async function getMe(telegramId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get(`/api/auth/telegram/me/${telegramId}`);
  return response?.data?.data || null;
}

async function setLanguage({ telegramId, botLanguageCode }) {
  if (!isBackendEnabled()) return null;
  const language = normalizeLanguage(botLanguageCode);
  if (!language) return null;

  const client = createBackendClient();
  const response = await client.post('/api/auth/telegram/language', {
    telegram_id: telegramId,
    language,
  });
  return response?.data?.data || null;
}

module.exports = {
  telegramLogin,
  getMe,
  setLanguage,
  normalizeLanguage,
};
