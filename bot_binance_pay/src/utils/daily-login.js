const BackendPoint = require('../services/backend-point');

const DATE_LOCALES = { vi: 'vi-VN', ru: 'ru-RU', zh: 'zh-CN' };

function formatNextClaimTime(iso, langCode, claimTimezone) {
  if (!iso || !claimTimezone) return '—';
  try {
    return new Date(iso).toLocaleString(DATE_LOCALES[langCode] || 'en-US', {
      timeZone: claimTimezone,
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return iso;
  }
}

async function buildDailyLoginScreen(t, langCode, telegramId) {
  const status = await BackendPoint.getDailyStatus(telegramId);
  if (!status) {
    return { text: t('checkout_coming_soon'), keyboard: [[{ text: t('back'), callback_data: 'credits_menu' }]] };
  }

  const lines = [
    `📅 ${t('daily_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    t('daily_reward_line', { amount: status.points_reward }),
    '',
    status.can_claim
      ? t('daily_can_claim')
      : t('daily_claimed_today', {
          time: formatNextClaimTime(status.next_claim_at, langCode, status.claim_timezone),
        }),
  ];

  const keyboard = [[{ text: t('back'), callback_data: 'credits_menu' }]];
  if (status.can_claim) {
    keyboard.unshift([{ text: t('daily_claim_btn'), callback_data: 'daily_claim' }]);
  }

  return { text: lines.join('\n'), keyboard };
}

module.exports = { buildDailyLoginScreen };
