const i18n = require('../locales');

function buildLanguagePickerKeyboard(userId, t) {
  const current = i18n.getUserLang(userId);
  const rows = i18n.listLocalesForPicker().map(({ code, flag, nativeName }) => [
    {
      text: `${flag} ${nativeName}${code === current ? ' ✓' : ''}`,
      callback_data: `lang_${code}`,
    },
  ]);
  rows.push([{ text: t('back'), callback_data: 'back_main' }]);
  return rows;
}

module.exports = { buildLanguagePickerKeyboard };
