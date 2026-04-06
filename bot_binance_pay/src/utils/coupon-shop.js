const { formatDiscountLine } = require('./coupon-format');

function formatCouponShopMessage(items, t) {
  const lines = [
    `🛒 ${t('coupon_shop_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  if (items.length === 0) {
    lines.push(t('coupon_shop_empty'));
    return lines.join('\n');
  }

  items.forEach((item, idx) => {
    const discount = formatDiscountLine(item, t);
    lines.push(
      `\`${item.code}\` · ${item.product_name}`,
      `   ${item.variant_name} · ${discount}`,
      `   ${t('coupon_shop_cost', { point: item.cost_point })}`,
    );
    if (idx < items.length - 1) {
      lines.push('');
    }
  });

  lines.push('', t('coupon_shop_hint'));
  return lines.join('\n');
}

function buildCouponShopKeyboard(items, t) {
  const keyboard = items.map((item) => [{
    text: t('coupon_shop_item_btn', { code: item.code, point: item.cost_point }).slice(0, 60),
    callback_data: `coupon_shop_redeem_${item.code}`,
  }]);
  keyboard.push([{ text: t('back'), callback_data: 'back_main' }]);
  return keyboard;
}

module.exports = {
  formatCouponShopMessage,
  buildCouponShopKeyboard,
};
