// Keyboard builders
const { formatPrice, formatCategoryPrice, formatVariantPrice, buildVariantLabel, wideInlineLabel } = require('./helpers');


function buildShopKeyboard(products, t = null, supportUrl = null, langCode = 'en') {
  const keyboard = products.map(p => {
    const name = langCode === 'vi' ? (p.name_vi || p.name_en) : (p.name_en || p.name_vi);
    const priceText = formatCategoryPrice(
      { minUsdt: p.min_price_usdt, minVnd: p.min_price_vnd },
      t,
      langCode,
    );
    const label = priceText ? `🛍️ ${name} ➜ (${priceText})` : `🛍️ ${name}`;
    return [{ text: wideInlineLabel(label), callback_data: `product_${p.id}` }];
  });

  if (t) {
    keyboard.push([
      { text: t('profile_btn'), callback_data: 'main_profile' },
      { text: t('history_btn'), callback_data: 'main_history' },
    ]);
    keyboard.push([
      { text: t('main_my_coupons_btn'), callback_data: 'my_coupons_hub' },
      { text: t('main_coupon_shop_btn'), callback_data: 'coupon_shop_menu' },
    ]);
    keyboard.push([
      { text: t('deposit_btn'), callback_data: 'deposit_menu' },
      { text: t('credits_btn'), callback_data: 'credits_menu' },
    ]);
    keyboard.push([{ text: t('language_btn'), callback_data: 'lang_menu' }]);
  }

  if (supportUrl && t) {
    keyboard.push([{ text: t('contact_admin'), url: supportUrl }]);
  }

  return keyboard;
}

function buildVariantKeyboard(product, variants, t, langCode = 'en') {
  const keyboard = variants.map(v => {
    const label = buildVariantLabel(v, langCode);
    const priceText = formatVariantPrice(v, langCode);
    const fullLabel = priceText ? `${label} | ${priceText}` : label;
    return [{ text: wideInlineLabel(fullLabel), callback_data: `variant_${product.id}_${v.id}` }];
  });
  if (t) keyboard.push([{ text: t('back'), callback_data: 'back_main' }]);
  return keyboard;
}

function buildQtyKeyboard(productId, variantId, stockCount, t) {
  const presets = [1, 2, 3, 5, 10].filter(n => n <= stockCount);
  const rows = [];
  const row = presets.map(n => ({ text: `『${n}』`, callback_data: `qty_${productId}_${variantId}_${n}` }));
  if (row.length <= 3) rows.push(row);
  else { rows.push(row.slice(0, 3)); rows.push(row.slice(3)); }
  if (stockCount > 5 && t) rows.push([{ text: t('enter_quantity'), callback_data: `customqty_${productId}_${variantId}` }]);
  if (t) rows.push([{ text: t('back'), callback_data: `product_${productId}` }]);
  return rows;
}

const VND_BOT_METHODS = new Set(['BANK', 'BALANCE_VND']);

function filterBotPaymentMethods(paymentMethods, langCode = 'en') {
  const methods = Array.isArray(paymentMethods) ? paymentMethods : [];
  return methods.filter((method) => {
    if (VND_BOT_METHODS.has(method)) return langCode === 'vi';
    return true;
  });
}

function buildPaymentMethodKeyboard(productId, variantId, qty, paymentMethods, t, langCode = 'en', options = {}) {
  const visibleMethods = filterBotPaymentMethods(paymentMethods, langCode);
  const labels = {
    BINANCE: t ? t('pay_binance') : '💰 Binance Pay',
    BALANCE: t ? t('pay_balance_usdt') : '💵 USDT balance',
    BALANCE_VND: t ? t('pay_balance_vnd') : '💵 VND balance',
    CRYPTO: t ? t('pay_crypto') : '🔑 Crypto',
    BANK: t ? t('pay_bank') : '🏦 Bank Transfer',
  };
  const keyboard = visibleMethods.map(method => [{
    text: labels[method] || method,
    callback_data: `pay_method_${productId}_${variantId}_${qty}_${method}`,
  }]);
  if (t) {
    const couponRow = [
      { text: t('pick_my_coupon'), callback_data: `coupon_pick_${productId}_${variantId}_${qty}` },
      { text: t('enter_coupon'), callback_data: `coupon_enter_${productId}_${variantId}_${qty}` },
    ];
    if (options.couponCode || options.userCouponId) {
      couponRow.push({
        text: t('clear_coupon'),
        callback_data: `coupon_clear_${productId}_${variantId}_${qty}`,
      });
    }
    keyboard.push(couponRow);
    keyboard.push([{ text: t('back'), callback_data: `variant_${productId}_${variantId}` }]);
  }
  return keyboard;
}

function buildDepositKeyboard(t = null, langCode = 'en') {
  const config = require('../config');
  const keyboard = [
    [{ text: t('deposit_binance'), callback_data: 'deposit_binance' }]
  ];

  if (config.BANK_ENABLED && langCode === 'vi') {
    keyboard.push([{ text: t ? t('deposit_bank') : '🏦 Bank Transfer', callback_data: 'deposit_bank' }]);
  }

  if (t) {
    keyboard.push([{ text: t('back'), callback_data: 'back_main' }]);
  }
  return keyboard;
}

function buildDepositAmountKeyboard(method, t = null) {
  const amounts =
    method === 'binance' ? [1, 5, 10, 20, 50, 100] : [10000, 20000, 50000, 100000, 200000, 500000];
  const keyboard = [];
  const row = [];

  amounts.forEach((amount, idx) => {
    const label = method === 'binance' ? `${amount} USDT` : formatPrice(amount, 'VNĐ');
    row.push({ text: label, callback_data: `deposit_amount_${method}_${amount}` });
    if ((idx + 1) % 3 === 0 || idx === amounts.length - 1) {
      keyboard.push([...row]);
      row.length = 0;
    }
  });

  if (t) {
    keyboard.push([{ text: t('enter_amount'), callback_data: `deposit_custom_${method}` }]);
    keyboard.push([{ text: t('back'), callback_data: 'deposit_menu' }]);
  }

  return keyboard;
}

module.exports = {
  buildShopKeyboard,
  buildVariantKeyboard,
  buildQtyKeyboard,
  filterBotPaymentMethods,
  buildPaymentMethodKeyboard,
  buildDepositKeyboard,
  buildDepositAmountKeyboard,
};
