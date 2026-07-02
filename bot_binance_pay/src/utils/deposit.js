const config = require('../config');
const { formatPrice } = require('./helpers');

/** Returns a block message when bank topup is unavailable (language / shop config). */
function bankTopupBlockedMessage(t, langCode) {
  if (langCode !== 'vi') return t('bank_vi_only');
  if (!config.BANK_ENABLED) return t('bank_not_configured');
  return null;
}

function formatBinanceTopupMessage(topup, t) {
  const lines = [
    `💰 ${t('topup_binance_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('topup_amount')}: ${formatPrice(topup.amount, 'USDT')}`,
    `${t('order_payment_code')}: \`${topup.payment_code}\``,
  ];
  if (topup.seconds_left != null) {
    const mins = Math.max(1, Math.ceil(topup.seconds_left / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
  }
  lines.push(
    '',
    t('binance_instructions'),
    t('binance_step1'),
    t('binance_step2'),
    t('binance_step3'),
    t('binance_step4', { id: topup.binance_id || 'N/A' }),
    t('binance_step5', { amount: `${topup.amount} USDT` }),
    t('binance_step6', { note: topup.payment_code }),
    t('binance_step7'),
    '',
    t('payment_warning'),
  );
  return lines.join('\n');
}

function buildTopupKeyboard(topupId, t) {
  return [
    [{ text: t('check_payment'), callback_data: `topup_check_${topupId}` }],
    [{ text: t('cancel'), callback_data: `topup_cancel_${topupId}` }],
    [{ text: t('back'), callback_data: 'deposit_menu' }],
  ];
}

function formatBankTopupMessage(topup, t) {
  const lines = [
    `💰 ${t('topup_bank_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('topup_amount')}: ${formatPrice(topup.amount, 'VNĐ')}`,
    `${t('order_payment_code')}: \`${topup.payment_code}\``,
  ];
  if (topup.seconds_left != null) {
    const mins = Math.max(1, Math.ceil(topup.seconds_left / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
  }
  if (topup.bank_name) {
    lines.push(
      '',
      t('bank_info'),
      t('bank_name', { name: topup.bank_name }),
      t('bank_account', { account: topup.bank_account || '' }),
      t('bank_owner', { owner: topup.bank_owner || '' }),
      t('payment_note', { code: topup.payment_code }),
    );
  }
  lines.push('', t('payment_warning'));
  return lines.join('\n');
}

function presentTopupScreen(ctx, topup, text, keyboard) {
  const qrUrl = topup.vietqr_url || topup.binance_qr_url || null;
  const opts = {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  };
  const fromCallback = Boolean(ctx.callbackQuery?.message);

  const send = () => {
    if (qrUrl) {
      return ctx.replyWithPhoto(qrUrl, { caption: text, ...opts });
    }
    return ctx.reply(text, opts);
  };

  if (!fromCallback) return send();
  return ctx.deleteMessage().catch(() => {}).then(() => send());
}

function mapTopupError(t, code, method) {
  if (code === 'invalid_amount') {
    if (method === 'bank') {
      return t('min_amount', { amount: formatPrice(config.MIN_BANK_TOPUP_VND, 'VNĐ') });
    }
    return t('min_amount', { amount: '0.01 USDT' });
  }
  const map = {
    user_not_found: t('checkout_user_not_found'),
    pending_topup_exists: t('pending_topup_exists'),
    bank_not_configured: t('bank_not_configured'),
    bank_vi_only: t('bank_vi_only'),
  };
  if (code && map[code]) {
    return map[code];
  }
  return t('checkout_failed');
}

module.exports = {
  bankTopupBlockedMessage,
  formatBinanceTopupMessage,
  formatBankTopupMessage,
  buildTopupKeyboard,
  presentTopupScreen,
  mapTopupError,
};
