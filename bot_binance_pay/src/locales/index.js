// i18n service — chỉ cache ngôn ngữ + dịch chuỗi + catalog locale (không build Telegram keyboard).
const en = require('./en');
const ru = require('./ru');
const zh = require('./zh');
const vi = require('./vi');

const languages = { en, ru, zh, vi };
const defaultLang = 'en';
const userLangs = new Map();

function setUserLang(userId, langCode) {
  if (languages[langCode]) {
    userLangs.set(userId, langCode);
  }
}

function getUserLang(userId) {
  return userLangs.get(userId) || defaultLang;
}

function loadUserLangs(users) {
  users.forEach((u) => {
    if (u.language && languages[u.language]) {
      userLangs.set(u.id, u.language);
    }
  });
}

function listLocalesForPicker() {
  return Object.keys(languages).map((code) => {
    const pack = languages[code];
    return { code, flag: pack._flag, nativeName: pack._name };
  });
}

function translate(userId, key, params = {}) {
  const langCode = getUserLang(userId);
  const lang = languages[langCode] || languages[defaultLang];

  let text = key.split('.').reduce((obj, k) => obj?.[k], lang);
  if (!text && langCode !== defaultLang) {
    text = key.split('.').reduce((obj, k) => obj?.[k], languages[defaultLang]);
  }
  if (!text) return key;

  if (typeof text === 'string') {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
  }

  return text;
}

function getTranslator(userId) {
  return (key, params = {}) => translate(userId, key, params);
}

module.exports = {
  setUserLang,
  getUserLang,
  loadUserLangs,
  listLocalesForPicker,
  getTranslator,
};
