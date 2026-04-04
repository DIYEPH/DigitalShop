const BackendAuth = require('./backend-auth');
const i18n = require('../locales');

async function syncLanguage(telegramId, rawLangCode) {
  const language = BackendAuth.normalizeLanguage(rawLangCode);
  if (!language) return { ok: false };

  try {
    const data = await BackendAuth.setLanguage({
      telegramId,
      botLanguageCode: language,
    });
    const resolved = BackendAuth.normalizeLanguage(data?.user?.language);
    i18n.setUserLang(telegramId, resolved || language);
    return { ok: true };
  } catch (err) {
    console.error('syncLanguage persist failed:', err?.message || err);
    return { ok: false };
  }
}

module.exports = { syncLanguage };
