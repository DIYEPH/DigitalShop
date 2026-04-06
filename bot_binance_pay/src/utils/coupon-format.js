function formatDiscountLine(item, t) {
  if (item.discount_type === 'FIXED') {
    const parts = [];
    if (item.discount_amount_usdt != null) {
      parts.push(`${item.discount_amount_usdt} USDT`);
    }
    if (item.discount_amount_vnd != null) {
      parts.push(`${item.discount_amount_vnd} VNĐ`);
    }
    return parts.join(' / ');
  }
  if (item.discount_percent != null) {
    return t('coupon_discount_percent', { percent: item.discount_percent });
  }
  return '—';
}

module.exports = { formatDiscountLine };
