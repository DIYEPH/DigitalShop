// Helper utilities
const config = require('../config');

const POINT_DISPLAY_CURRENCY = 'Point';

function formatPoint(amount) {
  const rounded = Math.round(Number(amount) * 100) / 100;
  return `${rounded} ${POINT_DISPLAY_CURRENCY}`;
}

function formatPrice(price, currency = 'USDT') {
  const rounded = Math.round(Number(price) * 100) / 100;
  if (currency === 'VNĐ') {
    if (rounded < 1000) return `${rounded} ₫`;
    const k = Math.round((rounded / 1000) * 10) / 10;
    return `${k % 1 === 0 ? k.toFixed(0) : k} K₫`;
  }
  return `${rounded} USDT`;
}

function getFullName(user) {
  return (user.first_name + (user.last_name ? ' ' + user.last_name : '')).trim();
}

/** Shop support link (shops.support_url); accepts a full URL or @username. */
function getSupportUrl() {
  const raw = String(config.SUPPORT_URL ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://t.me/${raw.replace(/^@/, '')}`;
}

function formatDateShort(date) {
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCategoryPrice(range, t = null, langCode = 'en') {
  if (!range || (range.minUsdt == null && range.minVnd == null)) return null;
  const usdtText = formatPrice(range.minUsdt, 'USDT');
  const vndText = formatPrice(range.minVnd, 'VNĐ');
  const fromText = typeof t === 'function' ? t('from_price') : 'from';
  if (langCode === 'vi') return `${fromText} ${vndText}~${usdtText}`;
  if (langCode === 'en') return `${fromText} ${usdtText}~${vndText}`;
  return `${fromText} ${usdtText}`;
}

function formatVariantPrice(variant, langCode = 'en') {
  const usdt = Number(variant?.amount_usdt ?? variant?.amountUsdt);
  const vnd = Number(variant?.amount_vnd ?? variant?.amountVnd);
  if (!Number.isFinite(usdt) || !Number.isFinite(vnd) || usdt <= 0 || vnd <= 0) return null;
  const usdtText = formatPrice(usdt, 'USDT');
  const vndText = formatPrice(vnd, 'VNĐ');
  return langCode === 'vi' ? `${vndText} ~ ${usdtText}` : `${usdtText} ~ ${vndText}`;
}

function buildVariantLabel(variant, langCode = 'en') {
  const planName = langCode === 'vi'
    ? (variant.plan_name_vi || variant.plan_name_en)
    : (variant.plan_name_en || variant.plan_name_vi);
  const variantName = langCode === 'vi'
    ? (variant.name_vi || variant.name_en)
    : (variant.name_en || variant.name_vi);
  return planName ? `${planName} — ${variantName}` : variantName;
}

const INLINE_BTN_PAD_SPACES = 20;
const TG_INLINE_BTN_TEXT_MAX = 64;
const ZWJ = '\u200D';

function wideInlineLabel(visible) {
  let spaces = INLINE_BTN_PAD_SPACES;
  while (visible.length + spaces + 1 > TG_INLINE_BTN_TEXT_MAX && spaces > 0) spaces--;
  let v = visible;
  if (v.length + spaces + 1 > TG_INLINE_BTN_TEXT_MAX) {
    v = v.slice(0, TG_INLINE_BTN_TEXT_MAX - spaces - 1);
  }
  return v + ' '.repeat(spaces) + ZWJ;
}

module.exports = {
  formatPoint,
  formatPrice,
  getFullName,
  getSupportUrl,
  formatDateShort,
  formatCategoryPrice,
  formatVariantPrice,
  buildVariantLabel,
  wideInlineLabel,
};
