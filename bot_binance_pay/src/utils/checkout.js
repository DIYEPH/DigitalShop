const { formatPrice, buildVariantLabel } = require('./helpers');
const BackendAuth = require('../services/backend-auth');
const BackendOrder = require('../services/backend-order');
const BackendProduct = require('../services/backend-product');

const PAYMENT_METHODS = ['BALANCE_VND', 'BINANCE', 'BALANCE', 'CRYPTO', 'BANK'];

function normalizeCouponOpts(opts) {
  if (!opts) return null;
  if (typeof opts === 'string') return { couponCode: opts, userCouponId: null };
  return {
    couponCode: opts.couponCode || null,
    userCouponId: opts.userCouponId || null,
  };
}

function parseCouponCallbackData(data) {
  const parts = data.split('_');
  // Format: coupon_enter_{productId}_{variantId}_{qty} / coupon_clear_...
  return {
    productId: parseInt(parts[2], 10),
    variantId: parseInt(parts[3], 10),
    quantity: parseInt(parts[4], 10),
  };
}

async function loadCheckoutProductVariant(productId, variantId) {
  const product = await BackendProduct.getProductDetail(productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return null;
  return { product, variant };
}

function parsePayMethodCallback(data) {
  if (!data || !data.startsWith('pay_method_')) return null;
  const rest = data.slice('pay_method_'.length);
  let method = null;
  for (const candidate of PAYMENT_METHODS) {
    const suffix = `_${candidate}`;
    if (rest.endsWith(suffix)) {
      method = candidate;
      break;
    }
  }
  if (!method) return null;
  const head = rest.slice(0, -(method.length + 1));
  const [productIdStr, variantIdStr, qtyStr] = head.split('_');
  const productId = parseInt(productIdStr, 10);
  const variantId = parseInt(variantIdStr, 10);
  const quantity = parseInt(qtyStr, 10);
  if (!productId || !variantId || !quantity) return null;
  return { productId, variantId, quantity, method };
}

function formatLineTotals(variant, qty, langCode) {
  const totalUsdt = formatPrice(Number(variant.amount_usdt) * qty, 'USDT');
  const totalVnd = formatPrice(Math.round(Number(variant.amount_vnd) * qty), 'VNĐ');
  return langCode === 'vi' ? `${totalVnd} ~ ${totalUsdt}` : `${totalUsdt} ~ ${totalVnd}`;
}

function formatQuoteTotals(quote, langCode) {
  if (!quote) return null;
  const totalUsdt = formatPrice(quote.total_usdt, 'USDT');
  const totalVnd = formatPrice(quote.total_vnd, 'VNĐ');
  return langCode === 'vi' ? `${totalVnd} ~ ${totalUsdt}` : `${totalUsdt} ~ ${totalVnd}`;
}

async function resolveCheckoutTotals(telegramId, variant, qty, langCode, couponOpts = null) {
  const couponCode = couponOpts?.couponCode ?? null;
  const userCouponId = couponOpts?.userCouponId ?? null;
  try {
    const quote = await BackendOrder.quoteTelegramOrder({
      telegramId,
      variantId: variant.id,
      quantity: qty,
      couponCode,
      userCouponId,
    });
    const fromQuote = formatQuoteTotals(quote, langCode);
    if (fromQuote) return { totalText: fromQuote, quote };
  } catch (err) {
    if (couponCode || userCouponId) throw err;
  }
  return {
    totalText: formatLineTotals(variant, qty, langCode),
    quote: null,
  };
}

function buildProductLabel(product, variant, langCode) {
  const productName = langCode === 'vi' ? (product.name_vi || product.name_en) : (product.name_en || product.name_vi);
  const label = buildVariantLabel(variant, langCode);
  return { productName, label };
}

async function buildPaymentScreenLines(ctx, product, variant, qty, t, langCode, couponOpts = null) {
  const { productName, label } = buildProductLabel(product, variant, langCode);
  const { totalText, quote } = await resolveCheckoutTotals(ctx.from.id, variant, qty, langCode, couponOpts);

  let balanceHint = '';
  try {
    const u = (await BackendAuth.getMe(ctx.from.id))?.user;
    if (u) {
      balanceHint = `💼 USDT: ${formatPrice(u.balanceUsdt, 'USDT')} | VNĐ: ${formatPrice(u.balanceVnd, 'VNĐ')}`;
    }
  } catch {
    // ignore
  }

  const couponLine =
    quote?.coupon_applied ? `🎟️ ${t('coupon_applied_line', { code: quote.coupon_applied })}` : null;

  return [
    `💳 ${t('payment_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `🛍️ ${productName} — ${label} x${qty}`,
    `💰 ${totalText}`,
    couponLine,
    balanceHint,
    '',
    t('select_payment'),
  ].filter(Boolean);
}

function mapCheckoutError(t, code) {
  const map = {
    user_not_found: t('checkout_user_not_found'),
    variant_not_found: t('product_not_found'),
    invalid_quantity: t('invalid_quantity'),
    insufficient_stock: t('not_enough_stock_generic'),
    coupon_invalid: t('coupon_invalid'),
    coupon_limit_exceeded: t('coupon_limit_exceeded'),
    coupon_not_owned: t('coupon_not_owned'),
    coupon_already_used: t('coupon_already_used'),
    insufficient_balance_point: t('insufficient_balance_point'),
    coupon_not_for_sale: t('coupon_not_for_sale'),
    payment_method_invalid: t('payment_method_invalid'),
    pending_order_exists: t('pending_order_exists'),
    preorder_limit_exceeded: t('preorder_limit_exceeded'),
    insufficient_balance_usdt: t('insufficient_balance_usdt'),
    insufficient_balance_vnd: t('insufficient_balance_vnd'),
    bank_not_configured: t('bank_not_configured'),
    order_not_cancellable: t('order_cancel_failed'),
    daily_already_claimed: t('daily_already_claimed'),
  };
  if (code && map[code]) {
    return map[code];
  }
  return t('checkout_failed');
}

function formatBalanceDeliveredMessage(order, t) {
  const amount = formatOrderAmount(order);
  const lines = [
    `✅ ${t('balance_pay_success')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('order_total')}: ${amount}`,
    `${t('order_id')}: \`${order.order_id}\``,
  ];
  if (order.delivery_lines?.length) {
    lines.push('', `🔑 ${t('accounts_title')}`);
    order.delivery_lines.forEach((line) => lines.push(`\`${line}\``));
  }
  lines.push('', t('change_password'), t('buy_more'));
  return lines.join('\n');
}

function formatOrderAmount(order) {
  return order.currency === 'VND'
    ? formatPrice(order.total_price, 'VNĐ')
    : formatPrice(order.total_price, 'USDT');
}

function formatOrderPaymentHints(order, method, t) {
  const lines = [];
  const paymentMethod = method || order.payment_method;

  if (order.expires_at && ['BINANCE', 'CRYPTO', 'BANK'].includes(paymentMethod)) {
    const mins = Math.max(1, Math.ceil((order.seconds_left || 0) / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
    if (paymentMethod === 'BANK') {
      lines.push('', t('order_pending_bank_hint'));
    } else if (paymentMethod === 'BINANCE' || paymentMethod === 'CRYPTO') {
      lines.push('', t('order_pending_binance_hint'));
    }
  } else if (paymentMethod === 'BALANCE' || paymentMethod === 'BALANCE_VND') {
    lines.push('', t('order_pending_balance_pay_now'));
  }
  return lines;
}

function formatOrderResumeMessage(order, t) {
  const amount = formatOrderAmount(order);
  const lines = [
    `⏳ ${t('pending_order_resume_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `📦 ${order.item_name || '—'} x${order.quantity || 1}`,
    `${t('order_payment_code')}: \`${order.payment_code}\``,
    `${t('order_total')}: ${amount}`,
    `${t('order_status')}: ${order.status}`,
    ...formatOrderPaymentHints(order, order.payment_method, t),
  ];
  return lines.join('\n');
}

function formatPendingOrderBlockMessage(pending, t) {
  const amount = formatOrderAmount(pending);
  const lines = [
    `⚠️ ${t('pending_order_block_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    t('pending_order_block_body'),
    '',
    `📦 ${pending.item_name} x${pending.quantity}`,
    `${t('order_payment_code')}: \`${pending.payment_code}\``,
    `${t('order_total')}: ${amount}`,
  ];
  if (pending.expires_at) {
    const mins = Math.max(1, Math.ceil((pending.seconds_left || 0) / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
  }
  return lines.join('\n');
}

function buildPendingOrderKeyboard(orderId, t) {
  return [
    [{ text: t('pending_continue_pay'), callback_data: `pending_resume_${orderId}` }],
    [{ text: t('pending_cancel_order'), callback_data: `pending_cancel_${orderId}` }],
    [{ text: t('back'), callback_data: 'back_main' }],
  ];
}

function formatBinanceOrderPaymentMessage(payment, t) {
  const amount = formatOrderAmount(payment);
  const lines = [
    `💳 ${t('order_binance_pay_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('order_total')}: ${amount}`,
    `${t('order_payment_code')}: \`${payment.payment_code}\``,
  ];
  if (payment.seconds_left != null) {
    const mins = Math.max(1, Math.ceil(payment.seconds_left / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
  }
  lines.push(
    '',
    t('binance_instructions'),
    t('binance_step1'),
    t('binance_step2'),
    t('binance_step3'),
    t('binance_step4', { id: payment.binance_id || 'N/A' }),
    t('binance_step5', { amount: `${payment.total_price} ${payment.currency}` }),
    t('binance_step6', { note: payment.payment_code }),
    t('binance_step7'),
    '',
    t('payment_warning'),
  );
  if (payment.status === 'DELIVERED' && payment.delivery_lines?.length) {
    lines.push('', `✅ ${t('order_delivered_title')}`, '━━━━━━━━━━━━━━━━━━━━━');
    payment.delivery_lines.forEach((line) => lines.push(`\`${line}\``));
  }
  return lines.join('\n');
}

function formatBankOrderPaymentMessage(payment, t) {
  const amount = formatOrderAmount(payment);
  const lines = [
    `🏦 ${t('order_bank_pay_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('order_total')}: ${amount}`,
    `${t('order_payment_code')}: \`${payment.payment_code}\``,
  ];
  if (payment.seconds_left != null) {
    const mins = Math.max(1, Math.ceil(payment.seconds_left / 60));
    lines.push(`${t('order_expires', { minutes: mins })}`);
  }
  lines.push(
    '',
    t('bank_info'),
    t('bank_name', { name: payment.bank_name || '—' }),
    t('bank_account', { account: payment.bank_account || '—' }),
    t('bank_owner', { owner: payment.bank_owner || '—' }),
    '',
    t('payment_note', { code: payment.payment_code }),
    '',
    t('scan_qr'),
    '',
    t('payment_warning'),
  );
  if (payment.status === 'DELIVERED' && payment.delivery_lines?.length) {
    lines.push('', `✅ ${t('order_delivered_title')}`, '━━━━━━━━━━━━━━━━━━━━━');
    payment.delivery_lines.forEach((line) => lines.push(`\`${line}\``));
  }
  return lines.join('\n');
}

function buildOrderBankKeyboard(orderId, t) {
  return buildOrderBinanceKeyboard(orderId, t);
}

async function presentBankOrderPayment(ctx, payment, orderId, t) {
  const text = formatBankOrderPaymentMessage(payment, t);
  const keyboard = buildOrderBankKeyboard(orderId, t);
  const qrUrl = payment.vietqr_url || null;
  const opts = {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  };
  const msg = ctx.callbackQuery?.message;
  const hasPhoto = Boolean(msg?.photo?.length);

  if (qrUrl) {
    if (hasPhoto) {
      await ctx.editMessageCaption(text, opts).catch((err) => {
        if (err.description !== 'Bad Request: message is not modified') {
          console.error('Edit caption error:', err.message);
        }
      });
    } else {
      await ctx.deleteMessage().catch(() => {});
      await ctx.replyWithPhoto(qrUrl, { caption: text, ...opts });
    }
  } else if (hasPhoto) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, opts);
  } else {
    await ctx
      .editMessageText(text, opts)
      .catch((err) => {
        if (err.description !== 'Bad Request: message is not modified') {
          console.error('Edit message error:', err.message);
        }
      });
  }
  ctx.answerCbQuery().catch(() => {});
}

async function presentOrderPayment(ctx, payment, orderId, t) {
  if (payment?.payment_method === 'BANK') {
    return presentBankOrderPayment(ctx, payment, orderId, t);
  }
  return presentBinanceOrderPayment(ctx, payment, orderId, t);
}

async function presentBinanceOrderPayment(ctx, payment, orderId, t) {
  const text = formatBinanceOrderPaymentMessage(payment, t);
  const keyboard = buildOrderBinanceKeyboard(orderId, t);
  const qrUrl = payment.binance_qr_url || null;
  const opts = {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  };
  const msg = ctx.callbackQuery?.message;
  const hasPhoto = Boolean(msg?.photo?.length);

  if (qrUrl) {
    if (hasPhoto) {
      await ctx.editMessageCaption(text, opts).catch((err) => {
        if (err.description !== 'Bad Request: message is not modified') {
          console.error('Edit caption error:', err.message);
        }
      });
    } else {
      await ctx.deleteMessage().catch(() => {});
      await ctx.replyWithPhoto(qrUrl, { caption: text, ...opts });
    }
  } else if (hasPhoto) {
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, opts);
  } else {
    await ctx
      .editMessageText(text, opts)
      .catch((err) => {
        if (err.description !== 'Bad Request: message is not modified') {
          console.error('Edit message error:', err.message);
        }
      });
  }
  ctx.answerCbQuery().catch(() => {});
}

function buildOrderBinanceKeyboard(orderId, t) {
  const rows = [];
  if (orderId) {
    rows.push(
      [{ text: t('check_payment'), callback_data: `order_check_${orderId}` }],
      [{ text: t('cancel_order'), callback_data: `order_cancel_${orderId}` }],
    );
  }
  rows.push([{ text: t('back'), callback_data: 'back_main' }]);
  return rows;
}

function formatOrderCreatedMessage(order, method, t) {
  const amount = formatOrderAmount(order);
  const lines = [
    `✅ ${t('order_created_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `${t('order_id')}: \`${order.order_id}\``,
    `${t('order_payment_code')}: \`${order.payment_code}\``,
    `${t('order_total')}: ${amount}`,
    `${t('order_status')}: ${order.status}`,
    ...formatOrderPaymentHints(order, method, t),
  ];
  return lines.join('\n');
}

module.exports = {
  normalizeCouponOpts,
  parseCouponCallbackData,
  loadCheckoutProductVariant,
  parsePayMethodCallback,
  buildPaymentScreenLines,
  mapCheckoutError,
  formatBinanceOrderPaymentMessage,
  formatBankOrderPaymentMessage,
  presentBinanceOrderPayment,
  presentBankOrderPayment,
  presentOrderPayment,
  buildOrderBinanceKeyboard,
  buildOrderBankKeyboard,
  formatOrderCreatedMessage,
  formatOrderResumeMessage,
  formatPendingOrderBlockMessage,
  buildPendingOrderKeyboard,
  formatBalanceDeliveredMessage,
  formatOrderPaymentHints,
};
