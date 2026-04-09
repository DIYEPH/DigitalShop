const { formatDiscountLine } = require('./coupon-format');

function formatCouponListMessage(items, t, group, introLine = '') {
  const titleKey = group === 'used' ? 'my_coupons_title_used' : 'my_coupons_title_active';
  const lines = [
    `🎟️ ${t(titleKey)}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
  ];

  if (introLine) {
    lines.push(introLine, '');
  }

  if (items.length === 0) {
    lines.push(t('my_coupons_empty'));
    return lines.join('\n');
  }

  items.forEach((item, idx) => {
    const discount = formatDiscountLine(item, t);
    lines.push(
      `\`${item.code}\` · ${item.product_name}`,
      `   ${item.variant_name} · ${discount}`,
    );
    if (item.expires_at) {
      lines.push(`   ${t('coupon_expires', { date: item.expires_at.slice(0, 10) })}`);
    }
    if (group === 'active' && !item.can_use && item.cannot_use_reason) {
      lines.push(`   ⚠️ ${t(`coupon_cannot_${item.cannot_use_reason}`)}`);
    }
    if (idx < items.length - 1) {
      lines.push('');
    }
  });

  lines.push('', t('my_coupons_tap_select'));
  return lines.join('\n');
}

function buildMyCouponsHubKeyboard(t) {
  return [
    [
      { text: t('my_coupons_tab_active'), callback_data: 'my_coupons_active' },
      { text: t('my_coupons_tab_used'), callback_data: 'my_coupons_used' },
    ],
    [{ text: t('back'), callback_data: 'back_main' }],
  ];
}

function buildMyCouponsListKeyboard(items, t, group, checkoutCtx = null) {
  const keyboard = [];

  if (group === 'active' && checkoutCtx) {
    for (const item of items) {
      if (!item.can_use) {
        continue;
      }
      if (item.variant_id !== checkoutCtx.variantId) {
        continue;
      }
      keyboard.push([{
        text: `🎟️ ${item.code}`.slice(0, 60),
        callback_data:
          `checkout_pick_coupon_${checkoutCtx.productId}_${checkoutCtx.variantId}_${checkoutCtx.quantity}_${item.user_coupon_id}`,
      }]);
    }
  }

  if (checkoutCtx) {
    keyboard.push([{
      text: t('back'),
      callback_data: `coupon_back_${checkoutCtx.productId}_${checkoutCtx.variantId}_${checkoutCtx.quantity}`,
    }]);
  } else {
    keyboard.push([{ text: t('my_coupons_back_hub'), callback_data: 'my_coupons_hub' }]);
    keyboard.push([{ text: t('back'), callback_data: 'back_main' }]);
  }
  return keyboard;
}

function formatMyCouponsHubMessage(t) {
  return [
    `🎟️ ${t('my_coupons_hub_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    t('my_coupons_hub_hint'),
  ].join('\n');
}

module.exports = {
  formatCouponListMessage,
  buildMyCouponsHubKeyboard,
  buildMyCouponsListKeyboard,
  formatMyCouponsHubMessage,
};
