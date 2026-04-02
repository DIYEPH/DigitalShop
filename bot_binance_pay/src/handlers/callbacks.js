const config = require('../config');
const Wallet = require('../services/wallet');
const Referral = require('../services/referral');
const BotLanguage = require('../services/bot-language');
const BackendAuth = require('../services/backend-auth');
const BackendProduct = require('../services/backend-product');
const BackendOrder = require('../services/backend-order');
const BackendWallet = require('../services/backend-wallet');
const BackendPoint = require('../services/backend-point');
const { buildDailyLoginScreen } = require('../utils/daily-login');
const { buildReferralDeepLink, formatReferralsList } = require('../utils/referral-ui');
const { extractBackendApiError } = require('./error-middleware');
const { resolveApiErrorMessage } = require('../utils/api-error-message');
const {
  normalizeCouponOpts,
  parseCouponCallbackData,
  loadCheckoutProductVariant,
  parsePayMethodCallback,
  buildPaymentScreenLines,
  presentBinanceOrderPayment,
  presentOrderPayment,
  formatOrderCreatedMessage,
  formatOrderResumeMessage,
  formatPendingOrderBlockMessage,
  buildPendingOrderKeyboard,
  formatBalanceDeliveredMessage,
} = require('../utils/checkout');
const {
  bankTopupBlockedMessage,
  formatBinanceTopupMessage,
  formatBankTopupMessage,
  buildTopupKeyboard,
  presentTopupScreen,
} = require('../utils/deposit');
const {
  formatHistoryListMessage,
  formatHistoryHubMessage,
  buildHistoryHubKeyboard,
  buildHistoryKeyboard,
  formatOrderDetailMessage,
  buildOrderDetailKeyboard,
  parseHistoryPageCallback,
  parseHistoryListCallback,
} = require('../utils/history');
const BackendCoupon = require('../services/backend-coupon');
const {
  buildMyCouponsHubScreen,
  buildMyCouponsListScreenForUser,
  buildCouponShopScreen,
} = require('../utils/coupon-screens');
const {
  formatPrice,
  formatPoint,
  getFullName,
  formatVariantPrice,
  buildVariantLabel,
} = require('../utils/helpers');
const { buildMainMenuPayload } = require('../utils/mainMenu');
const {
  buildVariantKeyboard,
  buildQtyKeyboard,
  buildPaymentMethodKeyboard,
  buildDepositKeyboard,
  buildDepositAmountKeyboard,
} = require('../utils/keyboard');
const { buildLanguagePickerKeyboard } = require('../utils/language-picker-keyboard');
const i18n = require('../locales');

const userState = new Map();

function editMsg(ctx, text, keyboard, parseMode = null) {
  const opts = {
    parse_mode: parseMode,
    reply_markup: { inline_keyboard: keyboard },
  };
  const msg = ctx.callbackQuery?.message;

  if (msg?.photo?.length) {
    ctx.deleteMessage().catch(() => {});
    ctx.reply(text, opts).catch((err) => {
      console.error('Reply after photo error:', err.message);
    });
  } else {
    ctx
      .editMessageText(text, opts)
      .catch((err) => {
        if (err.description !== 'Bad Request: message is not modified') {
          console.error('Edit message error:', err.message);
        }
      });
  }
  ctx.answerCbQuery().catch(() => {});
}

function register(bot) {
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data;
    if (!data || data.startsWith('adm_')) return;

    if (data === 'back_main' || data === 'main_shop') return handleBackMain(ctx);
    if (data === 'main_profile') return handleProfile(ctx);
    if (data === 'main_history' || data === 'history_hub') return handleHistoryHub(ctx);
    if (data === 'history_noop') return handleHistoryNoop(ctx);
    if (data.startsWith('history_list_')) return handleHistoryList(ctx);
    if (data.startsWith('history_page_')) return handleHistoryPage(ctx);
    if (data.startsWith('order_detail_')) return handleOrderDetail(ctx);
    if (data.startsWith('product_')) return handleProductView(ctx);
    if (data.startsWith('variant_')) return handleVariantSelect(ctx);
    if (data.startsWith('qty_')) return handleQuantitySelect(ctx);
    if (data.startsWith('customqty_')) return handleCustomQuantity(ctx);
    if (data.startsWith('coupon_enter_')) return handleCouponEnter(ctx);
    if (data.startsWith('coupon_clear_')) return handleCouponClear(ctx);
    if (data.startsWith('coupon_pick_')) return handleCouponPickAtCheckout(ctx);
    if (data.startsWith('coupon_back_')) return handleCouponBackToPayment(ctx);
    if (data.startsWith('checkout_pick_coupon_')) return handleCheckoutPickCoupon(ctx);
    if (data === 'my_coupons_hub') return handleMyCouponsHub(ctx);
    if (data === 'my_coupons_active') return handleMyCouponsList(ctx, 'active');
    if (data === 'my_coupons_used') return handleMyCouponsList(ctx, 'used');
    if (data === 'coupon_shop_menu') return handleCouponShopMenu(ctx);
    if (data.startsWith('coupon_shop_redeem_')) return handleCouponShopRedeem(ctx);
    if (data.startsWith('pay_method_')) return handlePaymentMethodSelect(ctx);
    if (data.startsWith('pending_resume_')) return handlePendingResume(ctx);
    if (data.startsWith('pending_cancel_')) return handlePendingCancel(ctx);
    if (data.startsWith('order_check_')) return handleOrderCheckPayment(ctx);
    if (data.startsWith('order_cancel_')) return handleOrderCancel(ctx);
    if (data === 'deposit_menu') return handleDepositMenu(ctx);
    if (data === 'deposit_binance' || data === 'deposit_bank') return handleDepositMethod(ctx);
    if (data.startsWith('deposit_amount_')) return handleDepositAmount(ctx);
    if (data.startsWith('deposit_custom_')) return handleDepositCustom(ctx);
    if (data.startsWith('topup_check_')) return handleTopupCheck(ctx);
    if (data.startsWith('topup_cancel_')) return handleTopupCancel(ctx);
    if (data === 'credits_menu') return handleCreditsMenu(ctx);
    if (data === 'daily_menu') return handleDailyLoginMenu(ctx);
    if (data === 'daily_claim') return handleDailyLoginClaim(ctx);
    if (data === 'my_referral') return handleMyReferral(ctx);
    if (data === 'my_referrals') return handleMyReferrals(ctx);
    if (data === 'enter_referral') return handleEnterReferral(ctx);
    if (data === 'copy_referral') return handleCopyReferral(ctx);
    if (data === 'enter_promo') return handleEnterPromo(ctx);
    if (data.startsWith('pay_') && !data.startsWith('pay_method_')) {
      return ctx.answerCbQuery(i18n.getTranslator(ctx.from.id)('checkout_coming_soon'), { show_alert: true }).catch(() => {});
    }
    if (data === 'lang_menu') return handleLanguageMenu(ctx);
    if (data.startsWith('lang_')) return handleLanguageSelect(ctx);
    ctx.answerCbQuery().catch(() => {});
  });
}

async function handleBackMain(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const { text, keyboard } = await buildMainMenuPayload(ctx.from, t, {
    includeWelcome: false,
    langCode: i18n.getUserLang(userId),
  });

  if (ctx.callbackQuery.message?.photo) {
    await ctx.deleteMessage();
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
  } else {
    ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard } }).catch(() => {});
  }
  ctx.answerCbQuery().catch(() => {});
}

async function handleProfile(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const me = await BackendAuth.getMe(userId);
  const profile = me?.user;
  if (!profile) throw new Error('profile_not_found');

  const text = [
    `👤 ${t('profile_title')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    t('profile_id', { id: profile.telegramId }),
    t('profile_name', { name: profile.fullName || getFullName(ctx.from) }),
    t('profile_username', { username: profile.username ? '@' + profile.username : t('no_username') }),
    '',
    `💰 ${t('balance_section')}`,
    t('balance_label', { amount: formatPrice(profile.balanceUsdt, 'USDT') }),
    t('credits_label', { amount: formatPoint(profile.balancePoint) }),
    '',
    `📊 ${t('stats_section')}`,
    t('completed_orders', { count: profile.completedOrders }),
    t('balance_spent_label', { amount: formatPrice(profile.balanceSpentUsdt, 'USDT') }),
    t('credits_spent_label', { amount: formatPoint(profile.creditsSpentCoin) }),
  ].join('\n');

  editMsg(ctx, text, [
    [{ text: t('deposit_btn'), callback_data: 'deposit_menu' }],
    [{ text: t('credits_btn'), callback_data: 'credits_menu' }],
    [{ text: t('back'), callback_data: 'back_main' }],
  ]);
}

async function presentHistoryHub(ctx, t) {
  const userId = ctx.from.id;
  const translator = t || i18n.getTranslator(userId);
  const pending = await BackendOrder.getPendingTelegramOrder(userId);
  const hasPending = Boolean(pending?.order_id);

  return {
    text: formatHistoryHubMessage(translator),
    keyboard: buildHistoryHubKeyboard(hasPending, translator),
    parseMode: null,
  };
}

async function presentHistory(ctx, page = 1, t, group) {
  const userId = ctx.from.id;
  const translator = t || i18n.getTranslator(userId);

  const result = await BackendOrder.listTelegramOrders({
    telegramId: userId,
    page,
    limit: 10,
    status: group,
  });
  const orders = result?.items ?? [];
  const meta = result?.meta ?? { page: 1, limit: 10, total: 0, total_pages: 0 };

  return {
    text: formatHistoryListMessage(orders, meta, translator, group),
    keyboard: buildHistoryKeyboard(orders, meta, translator, group),
    parseMode: 'Markdown',
  };
}

async function handleHistoryHub(ctx) {
  const t = i18n.getTranslator(ctx.from.id);
  try {
    const view = await presentHistoryHub(ctx, t);
    editMsg(ctx, view.text, view.keyboard, view.parseMode || null);
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleHistoryNoop(ctx) {
  return ctx.answerCbQuery().catch(() => {});
}

async function handleHistoryList(ctx) {
  const group = parseHistoryListCallback(ctx.callbackQuery.data);
  if (!group) return ctx.answerCbQuery().catch(() => {});
  return handleHistoryGroup(ctx, group, 1);
}

async function handleHistoryGroup(ctx, group, page) {
  const t = i18n.getTranslator(ctx.from.id);
  try {
    const view = await presentHistory(ctx, page, t, group);
    if (page > 1 && !view.keyboard.some((row) => row.some((b) => b.callback_data?.startsWith('order_detail_')))) {
      return handleHistoryGroup(ctx, group, 1);
    }
    editMsg(ctx, view.text, view.keyboard, view.parseMode || null);
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleHistoryPage(ctx) {
  const parsed = parseHistoryPageCallback(ctx.callbackQuery.data);
  if (!parsed) return ctx.answerCbQuery().catch(() => {});
  return handleHistoryGroup(ctx, parsed.group, parsed.page);
}

async function handleOrderDetail(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const orderId = ctx.callbackQuery.data.slice('order_detail_'.length);

  try {
    const order = await BackendOrder.getTelegramOrderDetail({ telegramId: userId, orderId });
    if (!order) {
      return ctx.answerCbQuery(t('order_not_found'), { show_alert: true }).catch(() => {});
    }
    const text = formatOrderDetailMessage(order, t);
    editMsg(ctx, text, buildOrderDetailKeyboard(order, t), 'Markdown');
  } catch (err) {
    const apiError = extractBackendApiError(err);
    const status = err?.response?.status;
    if (apiError?.code === 'order_not_found' || status === 404 || status === 400) {
      return ctx.answerCbQuery(t('order_not_found'), { show_alert: true }).catch(() => {});
    }
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleProductView(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const productId = parseInt(ctx.callbackQuery.data.split('_')[1]);

  const product = await BackendProduct.getProductDetail(productId);
  if (!product) return ctx.answerCbQuery(t('product_not_found'));

  const name = langCode === 'vi' ? (product.name_vi || product.name_en) : (product.name_en || product.name_vi);
  const desc = langCode === 'vi' ? product.description_vi : product.description_en;
  const activeVariants = product.variants.filter(v => v.is_active && v.stock_count > 0);

  const lines = [
    `🛍️ ${name}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    desc ? `📝 ${desc}\n` : null,
  ];

  if (activeVariants.length > 0) {
    lines.push(t('select_variant'), '');
    for (const v of activeVariants) {
      const label = buildVariantLabel(v, langCode);
      const price = formatVariantPrice(v, langCode);
      lines.push(price ? `• ${label}\n   💰 ${price}` : `• ${label}`);
    }
  } else {
    lines.push(t('no_variants'));
  }

  editMsg(ctx, lines.filter(Boolean).join('\n'), buildVariantKeyboard(product, activeVariants, t, langCode));
}

async function handleVariantSelect(ctx) {
  const [, productId, variantId] = ctx.callbackQuery.data.split('_');
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);

  const product = await BackendProduct.getProductDetail(parseInt(productId));
  const variant = product?.variants.find(v => v.id === parseInt(variantId));
  if (!variant || !variant.is_active) return ctx.answerCbQuery(t('product_not_found'));

  const productName = langCode === 'vi' ? (product.name_vi || product.name_en) : (product.name_en || product.name_vi);
  const label = buildVariantLabel(variant, langCode);
  const priceText = formatVariantPrice(variant, langCode);

  const lines = [
    `🛍️ ${productName}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `📦 ${t('selected_variant')}: ${label}`,
    priceText ? `💰 ${t('variant_price')}: ${priceText}` : null,
    t('product_stock', { count: variant.stock_count }),
    '',
    t('select_quantity'),
  ].filter(Boolean);

  editMsg(ctx, lines.join('\n'), buildQtyKeyboard(parseInt(productId), parseInt(variantId), variant.stock_count, t));
}


async function handleQuantitySelect(ctx) {
  const [, productId, variantId, qtyStr] = ctx.callbackQuery.data.split('_');
  const qty = parseInt(qtyStr);
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);

  const product = await BackendProduct.getProductDetail(parseInt(productId));
  const variant = product?.variants.find(v => v.id === parseInt(variantId));
  if (!variant || variant.stock_count < qty) {
    return ctx.answerCbQuery(t('not_enough_stock', { count: variant?.stock_count || 0 }));
  }

  await showPaymentScreen(ctx, product, variant, qty, t, langCode, null);
}

async function handleCustomQuantity(ctx) {
  const [, productId, variantId] = ctx.callbackQuery.data.split('_');
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);

  const product = await BackendProduct.getProductDetail(parseInt(productId));
  const variant = product?.variants.find(v => v.id === parseInt(variantId));
  if (!variant) return ctx.answerCbQuery(t('product_not_found'));

  userState.set(userId, {
    action: 'custom_qty',
    productId: parseInt(productId),
    variantId: parseInt(variantId),
    stockCount: variant.stock_count,
  });

  const productName = langCode === 'vi' ? (product.name_vi || product.name_en) : (product.name_en || product.name_vi);
  const text = [
    `✏️ ${t('enter_quantity')}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `📦 ${productName}`,
    t('product_stock', { count: variant.stock_count }),
  ].join('\n');
  editMsg(ctx, text, [[{ text: t('cancel'), callback_data: `variant_${productId}_${variantId}` }]]);
}

async function showPendingOrderBlock(ctx, pending, checkoutIntent, t) {
  const text = formatPendingOrderBlockMessage(pending, t);
  const keyboard = buildPendingOrderKeyboard(pending.order_id, t);
  if (checkoutIntent) {
    userState.set(ctx.from.id, { action: 'checkout_after_cancel', ...checkoutIntent });
  }
  editMsg(ctx, text, keyboard, 'Markdown');
}

async function showPaymentScreen(ctx, product, variant, qty, t, langCode, couponOpts = null) {
  const userId = ctx.from.id;
  const opts = normalizeCouponOpts(couponOpts);
  try {
    const pending = await BackendOrder.getPendingTelegramOrder(userId);
    if (pending) {
      return showPendingOrderBlock(ctx, pending, {
        productId: product.id,
        variantId: variant.id,
        quantity: qty,
        couponCode: opts?.couponCode || null,
        userCouponId: opts?.userCouponId || null,
      }, t);
    }
  } catch {
    // continue to payment screen if pending check fails
  }

  userState.set(userId, {
    action: 'checkout_payment',
    productId: product.id,
    variantId: variant.id,
    quantity: qty,
    couponCode: opts?.couponCode || null,
    userCouponId: opts?.userCouponId || null,
  });

  const lines = await buildPaymentScreenLines(ctx, product, variant, qty, t, langCode, opts);
  const keyboard = buildPaymentMethodKeyboard(product.id, variant.id, qty, variant.payment_methods, t, langCode, {
    couponCode: opts?.couponCode || null,
    userCouponId: opts?.userCouponId || null,
  });
  const text = lines.join('\n');

  if (ctx.callbackQuery?.message) {
    editMsg(ctx, text, keyboard);
  } else {
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
  }
}

async function handleCouponEnter(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const { productId, variantId, quantity } = parseCouponCallbackData(ctx.callbackQuery.data);

  userState.set(userId, { action: 'enter_coupon', productId, variantId, quantity });

  const text = `🎟️ ${t('coupon_prompt')}\n━━━━━━━━━━━━━━━━━━━━━`;
  editMsg(ctx, text, [[{ text: t('cancel'), callback_data: `qty_${productId}_${variantId}_${quantity}` }]]);
}

async function handleCouponClear(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const { productId, variantId, quantity } = parseCouponCallbackData(ctx.callbackQuery.data);
  const loaded = await loadCheckoutProductVariant(productId, variantId);
  if (!loaded) {
    return ctx.answerCbQuery(t('product_not_found'), { show_alert: true }).catch(() => {});
  }

  await showPaymentScreen(ctx, loaded.product, loaded.variant, quantity, t, i18n.getUserLang(userId), null);
  ctx.answerCbQuery().catch(() => {});
}

async function showOrderPayment(ctx, orderId, t) {
  const payment = await BackendOrder.getTelegramOrderPayment({
    telegramId: ctx.from.id,
    orderId,
  });
  if (!payment) {
    throw new Error('payment_not_found');
  }
  await presentOrderPayment(ctx, payment, orderId, t);
}

async function createOrderFromIntent(ctx, intent, t) {
  const order = await BackendOrder.createTelegramOrder({
    telegramId: ctx.from.id,
    variantId: intent.variantId,
    quantity: intent.quantity,
    paymentMethod: intent.paymentMethod,
    couponCode: intent.couponCode || null,
    userCouponId: intent.userCouponId || null,
  });
  if (!order) {
    throw new Error('create_failed');
  }
  if (intent.paymentMethod === 'BINANCE' || intent.paymentMethod === 'BANK') {
    return showOrderPayment(ctx, order.order_id, t);
  }
  if (
    (intent.paymentMethod === 'BALANCE' || intent.paymentMethod === 'BALANCE_VND') &&
    order.status === 'DELIVERED' &&
    order.delivery_lines?.length
  ) {
    const text = formatBalanceDeliveredMessage(order, t);
    editMsg(ctx, text, [[{ text: t('back'), callback_data: 'back_main' }]], 'Markdown');
    return;
  }
  const text = formatOrderCreatedMessage(order, intent.paymentMethod, t);
  editMsg(ctx, text, [[{ text: t('back'), callback_data: 'back_main' }]], 'Markdown');
}

async function handlePendingResume(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const orderId = ctx.callbackQuery.data.slice('pending_resume_'.length);

  try {
    const pending = await BackendOrder.getPendingTelegramOrder(userId);
    if (!pending || pending.order_id !== orderId) {
      return ctx.answerCbQuery(t('order_not_found'), { show_alert: true }).catch(() => {});
    }
    if (pending.payment_method === 'BINANCE' || pending.payment_method === 'BANK') {
      return showOrderPayment(ctx, orderId, t);
    }
    const text = formatOrderResumeMessage(pending, t);
    editMsg(ctx, text, [[{ text: t('back'), callback_data: 'back_main' }]], 'Markdown');
  } catch {
    ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }
}

async function handleOrderCheckPayment(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const orderId = ctx.callbackQuery.data.slice('order_check_'.length);

  try {
    const payment = await BackendOrder.checkTelegramOrderPayment({ telegramId: userId, orderId });
    if (!payment) {
      return ctx.answerCbQuery(t('order_not_found'), { show_alert: true }).catch(() => {});
    }
    if (payment.status === 'CANCELLED') {
      await ctx.answerCbQuery(t('order_cancelled_ok'), { show_alert: true }).catch(() => {});
      editMsg(ctx, t('order_cancelled_ok'), [[{ text: t('back'), callback_data: 'back_main' }]]);
      return;
    }
    if (payment.status === 'DELIVERED' && payment.delivery_lines?.length) {
      await ctx.answerCbQuery('✅').catch(() => {});
      return presentOrderPayment(ctx, payment, null, t);
    }
    if (payment.status === 'PAID') {
      await ctx.answerCbQuery(t('order_payment_processing'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery(t('order_still_pending'), { show_alert: true }).catch(() => {});
  } catch {
    ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }
}

async function handleOrderCancel(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const orderId = ctx.callbackQuery.data.slice('order_cancel_'.length);

  try {
    await BackendOrder.cancelTelegramOrder({ telegramId: userId, orderId });
    await ctx.answerCbQuery(t('order_cancelled_ok')).catch(() => {});
    editMsg(ctx, t('order_cancelled_ok'), [[{ text: t('back'), callback_data: 'back_main' }]]);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function handlePendingCancel(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const orderId = ctx.callbackQuery.data.slice('pending_cancel_'.length);
  const saved = userState.get(userId);

  try {
    await BackendOrder.cancelTelegramOrder({ telegramId: userId, orderId });
    userState.delete(userId);
    await ctx.answerCbQuery(t('order_cancelled_ok')).catch(() => {});

    if (saved?.action === 'checkout_after_cancel' && saved.paymentMethod) {
      await createOrderFromIntent(ctx, saved, t);
      return;
    }

    if (saved?.action === 'checkout_after_cancel' && saved.productId) {
      const product = await BackendProduct.getProductDetail(saved.productId);
      const variant = product?.variants.find((v) => v.id === saved.variantId);
      if (product && variant) {
        return showPaymentScreen(ctx, product, variant, saved.quantity, t, langCode, {
          couponCode: saved.couponCode || null,
          userCouponId: saved.userCouponId || null,
        });
      }
    }

    editMsg(ctx, t('order_cancelled_ok'), [[{ text: t('back'), callback_data: 'back_main' }]]);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function handlePaymentMethodSelect(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const parsed = parsePayMethodCallback(ctx.callbackQuery.data);

  if (!parsed) {
    return ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }

  try {
    const pending = await BackendOrder.getPendingTelegramOrder(userId);
    if (pending) {
      const saved = userState.get(userId);
      return showPendingOrderBlock(ctx, pending, {
        productId: parsed.productId,
        variantId: parsed.variantId,
        quantity: parsed.quantity,
        paymentMethod: parsed.method,
        couponCode: saved?.couponCode || null,
        userCouponId: saved?.userCouponId || null,
      }, t);
    }

    const saved = userState.get(userId);
    await createOrderFromIntent(ctx, {
      variantId: parsed.variantId,
      quantity: parsed.quantity,
      paymentMethod: parsed.method,
      couponCode: saved?.couponCode || null,
      userCouponId: saved?.userCouponId || null,
    }, t);
    userState.delete(userId);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function handleDepositMenu(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);

  let balanceText = '';
  try {
    const me = await BackendAuth.getMe(userId);
    const u = me?.user;
    if (u) {
      balanceText = `💼 USDT: ${formatPrice(u.balanceUsdt, 'USDT')} | VNĐ: ${formatPrice(u.balanceVnd, 'VNĐ')}\n\n`;
    }
  } catch { /* ignore */ }

  const text = `💰 ${t('deposit_title')}\n━━━━━━━━━━━━━━━━━━━━━\n\n${balanceText}${t('select_deposit_method')}`;

  if (ctx.callbackQuery.message?.photo) {
    await ctx.deleteMessage();
    await ctx.reply(text, { reply_markup: { inline_keyboard: buildDepositKeyboard(t, langCode) } });
    ctx.answerCbQuery().catch(() => {});
  } else {
    editMsg(ctx, text, buildDepositKeyboard(t, langCode));
  }
}

async function handleDepositMethod(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const method = ctx.callbackQuery.data.replace('deposit_', '');

  const bankBlocked = method === 'bank' ? bankTopupBlockedMessage(t, langCode) : null;
  if (bankBlocked) {
    return ctx.answerCbQuery(bankBlocked, { show_alert: true });
  }

  const currency = method === 'binance' ? 'USDT' : 'VND';
  const methodName = method === 'binance' ? 'Binance Pay' : 'Bank Transfer';

  const text = `💰 ${t('deposit_amount_title', { method: methodName })}\n━━━━━━━━━━━━━━━━━━━━━\n\n${t('deposit_currency', { currency })}\n\n${t('select_amount')}`;
  editMsg(ctx, text, buildDepositAmountKeyboard(method, t));
}

async function handleDepositAmount(ctx) {
  const [, , method, amount] = ctx.callbackQuery.data.split('_');
  const amountNum = parseFloat(amount);
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);

  const bankBlocked = method === 'bank' ? bankTopupBlockedMessage(t, langCode) : null;
  if (bankBlocked) {
    return ctx.answerCbQuery(bankBlocked, { show_alert: true }).catch(() => {});
  }

  return handleTopupCreate(ctx, userId, amountNum, method === 'binance' ? 'binance' : 'bank', t);
}

function formatTopupMessage(topup, t) {
  if (topup.provider === 'BANK' || topup.currency === 'VND') {
    return formatBankTopupMessage(topup, t);
  }
  return formatBinanceTopupMessage(topup, t);
}

async function handleTopupCreate(ctx, userId, amount, method, t) {
  try {
    const topup =
      method === 'bank'
        ? await BackendWallet.createBankTopup({ telegramId: userId, amount })
        : await BackendWallet.createBinanceTopup({ telegramId: userId, amount });
    if (!topup) throw new Error('create_failed');

    const text = formatTopupMessage(topup, t);
    const keyboard = buildTopupKeyboard(topup.topup_id, t);
    await presentTopupScreen(ctx, topup, text, keyboard);
    ctx.answerCbQuery().catch(() => {});
  } catch (err) {
    const apiError = extractBackendApiError(err);

    if (apiError?.code === 'pending_topup_exists' && apiError?.details?.topup) {
      const existing = apiError.details.topup;
      const text = formatTopupMessage(existing, t);
      const keyboard = buildTopupKeyboard(existing.topup_id, t);
      editMsg(ctx, text, keyboard, 'Markdown');
      return;
    }

    ctx.answerCbQuery(
      resolveApiErrorMessage(t, apiError?.code, { domain: 'topup', method }),
      { show_alert: true },
    ).catch(() => {});
  }
}

async function handleDepositCustom(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const method = ctx.callbackQuery.data.split('_')[2];

  const bankBlocked = method === 'bank' ? bankTopupBlockedMessage(t, langCode) : null;
  if (bankBlocked) {
    return ctx.answerCbQuery(bankBlocked, { show_alert: true }).catch(() => {});
  }

  userState.set(userId, {
    action: method === 'bank' ? 'custom_topup_bank' : 'custom_topup_binance',
    method,
    messageId: ctx.callbackQuery.message.message_id,
  });

  const currency = method === 'binance' ? 'USDT' : 'VNĐ';
  const minLine =
    method === 'bank'
      ? `${t('min_amount', { amount: formatPrice(config.MIN_BANK_TOPUP_VND, 'VNĐ') })}\n\n`
      : '';
  const text = `📝 ${t('enter_amount').replace('✏️', '').trim()}\n━━━━━━━━━━━━━━━━━━━━━\n\n${t('deposit_currency', { currency })}\n\n${minLine}${t('enter_amount')}`;
  editMsg(ctx, text, [[{ text: t('cancel'), callback_data: 'deposit_menu' }]]);
}

async function handleTopupCheck(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const topupId = parseInt(ctx.callbackQuery.data.slice('topup_check_'.length), 10);

  try {
    const topup = await BackendWallet.getTopupStatus({ telegramId: userId, topupId });
    if (!topup) return ctx.answerCbQuery(t('deposit_not_found'), { show_alert: true });

    if (topup.status === 'CONFIRMED') {
      await ctx.answerCbQuery('✅').catch(() => {});
      const isVnd = topup.currency === 'VND' || topup.provider === 'BANK';
      const successText = isVnd
        ? t('topup_success_vnd', { amount: formatPrice(topup.amount, 'VNĐ') })
        : t('topup_success', { amount: formatPrice(topup.amount, 'USDT') });
      const text = `✅ ${successText}`;
      if (ctx.callbackQuery.message?.photo) await ctx.deleteMessage().catch(() => {});
      ctx.reply(text, {
        reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'back_main' }]] },
      });
    } else if (topup.status === 'FAILED') {
      await ctx.answerCbQuery(t('topup_expired'), { show_alert: true }).catch(() => {});
      editMsg(ctx, t('topup_expired'), [[{ text: t('back'), callback_data: 'deposit_menu' }]]);
    } else {
      ctx.answerCbQuery(t('payment_pending'), { show_alert: true }).catch(() => {});
    }
  } catch {
    ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }
}

async function handleTopupCancel(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const topupId = parseInt(ctx.callbackQuery.data.slice('topup_cancel_'.length), 10);

  try {
    await BackendWallet.cancelTopup({ telegramId: userId, topupId });
    await ctx.answerCbQuery(t('order_cancelled_ok')).catch(() => {});
    editMsg(ctx, t('order_cancelled_ok'), [[{ text: t('back'), callback_data: 'deposit_menu' }]]);
  } catch {
    ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }
}

async function handleCreditsMenu(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const info = await Referral.getReferralInfo(userId);
  const wallet = await Wallet.getWallet(userId);

  const cfg = info?.config || {};
  if (!info) {
    return editMsg(ctx, t('error'), [[{ text: t('back'), callback_data: 'back_main' }]]);
  }

  const text = `🎁 ${t('credits_title')}\n━━━━━━━━━━━━━━━━━━━━━\n\n💰 ${t('credits_current', { amount: formatPoint(wallet?.balancePoint || 0) })}\n\n📊 ${t('how_to_earn')}\n${t('earn_referral', { amount: cfg.referrer_bonus ?? 1 })}\n${t('earn_referee', { amount: cfg.referee_bonus ?? 1 })}\n${t('earn_coupon_checkout')}\n${t('earn_events')}\n\n🔗 ${t('referral_code', { code: info.referralCode || 'N/A' })}\n👥 ${t('total_referrals', { count: info.totalReferrals || 0 })}\n💰 ${t('total_earned', { amount: formatPoint(info.totalEarned || 0) })}`;

  editMsg(ctx, text, [
    [{ text: t('daily_checkin_btn'), callback_data: 'daily_menu' }],
    [{ text: t('my_referral_btn'), callback_data: 'my_referral' }],
    [{ text: t('my_referrals_btn'), callback_data: 'my_referrals' }],
    ...(info.canBind === true ? [[{ text: t('enter_referral_btn'), callback_data: 'enter_referral' }]] : []),
    [{ text: t('back'), callback_data: 'back_main' }],
  ]);
}

function resolveCheckoutCouponContext(userId, group) {
  if (group !== 'active') {
    return null;
  }
  const state = userState.get(userId);
  if (state?.action !== 'checkout_payment') {
    return null;
  }
  return {
    productId: state.productId,
    variantId: state.variantId,
    quantity: state.quantity,
  };
}

async function handleMyCouponsHub(ctx) {
  const t = i18n.getTranslator(ctx.from.id);
  try {
    const screen = buildMyCouponsHubScreen(t);
    editMsg(ctx, screen.text, screen.keyboard);
    ctx.answerCbQuery().catch(() => {});
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleMyCouponsList(ctx, group, introLine = '') {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  try {
    const checkoutCtx = resolveCheckoutCouponContext(userId, group);
    const screen = await buildMyCouponsListScreenForUser(
      userId,
      t,
      group,
      introLine,
      checkoutCtx,
    );
    editMsg(ctx, screen.text, screen.keyboard);
    ctx.answerCbQuery().catch(() => {});
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleCouponShopMenu(ctx) {
  const t = i18n.getTranslator(ctx.from.id);
  try {
    const screen = await buildCouponShopScreen(t);
    editMsg(ctx, screen.text, screen.keyboard);
    ctx.answerCbQuery().catch(() => {});
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleCouponShopRedeem(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const code = ctx.callbackQuery.data.slice('coupon_shop_redeem_'.length);
  try {
    await BackendCoupon.redeemShopCoupon({ telegramId: userId, code });
    const introLine = t('coupon_redeem_congrats', { code });
    await handleMyCouponsList(ctx, 'active', introLine);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function handleCouponBackToPayment(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const rest = ctx.callbackQuery.data.slice('coupon_back_'.length);
  const [productIdStr, variantIdStr, qtyStr] = rest.split('_');
  const productId = parseInt(productIdStr, 10);
  const variantId = parseInt(variantIdStr, 10);
  const quantity = parseInt(qtyStr, 10);
  const loaded = await loadCheckoutProductVariant(productId, variantId);
  if (!loaded) {
    return ctx.answerCbQuery(t('product_not_found'), { show_alert: true }).catch(() => {});
  }
  const prev = userState.get(userId) || {};
  await showPaymentScreen(ctx, loaded.product, loaded.variant, quantity, t, langCode, {
    couponCode: prev.couponCode ?? null,
    userCouponId: prev.userCouponId ?? null,
  });
  ctx.answerCbQuery().catch(() => {});
}

async function handleCouponPickAtCheckout(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const rest = ctx.callbackQuery.data.slice('coupon_pick_'.length);
  const [productIdStr, variantIdStr, qtyStr] = rest.split('_');
  const productId = parseInt(productIdStr, 10);
  const variantId = parseInt(variantIdStr, 10);
  const quantity = parseInt(qtyStr, 10);
  const prev = userState.get(userId) || {};
  userState.set(userId, {
    ...prev,
    action: 'checkout_payment',
    productId,
    variantId,
    quantity,
  });
  try {
    const screen = await buildMyCouponsListScreenForUser(userId, t, 'active', '', {
      productId,
      variantId,
      quantity,
    });
    editMsg(ctx, screen.text, screen.keyboard);
    ctx.answerCbQuery().catch(() => {});
  } catch {
    ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }
}

async function handleCheckoutPickCoupon(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const rest = ctx.callbackQuery.data.slice('checkout_pick_coupon_'.length);
  const parts = rest.split('_');
  const userCouponId = parseInt(parts.pop(), 10);
  const quantity = parseInt(parts.pop(), 10);
  const variantId = parseInt(parts.pop(), 10);
  const productId = parseInt(parts.join('_'), 10);

  const loaded = await loadCheckoutProductVariant(productId, variantId);
  if (!loaded) {
    return ctx.answerCbQuery(t('product_not_found'), { show_alert: true }).catch(() => {});
  }

  try {
    await showPaymentScreen(ctx, loaded.product, loaded.variant, quantity, t, langCode, {
      couponCode: null,
      userCouponId,
    });
    ctx.answerCbQuery().catch(() => {});
  } catch (err) {
    const apiError = extractBackendApiError(err);
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function showDailyLogin(ctx, prefixLine = '') {
  const userId = ctx.from.id;
  const { text, keyboard } = await buildDailyLoginScreen(
    i18n.getTranslator(userId),
    i18n.getUserLang(userId),
    userId,
  );
  editMsg(ctx, prefixLine ? `${prefixLine}\n\n${text}` : text, keyboard);
}

async function handleDailyLoginMenu(ctx) {
  const t = i18n.getTranslator(ctx.from.id);
  try {
    await showDailyLogin(ctx);
    ctx.answerCbQuery().catch(() => {});
  } catch {
    ctx.answerCbQuery(t('checkout_failed'), { show_alert: true }).catch(() => {});
  }
}

async function handleDailyLoginClaim(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);

  try {
    const result = await BackendPoint.claimDaily(userId);
    if (!result) {
      return ctx.answerCbQuery(t('checkout_coming_soon'), { show_alert: true }).catch(() => {});
    }
    await ctx.answerCbQuery('✅').catch(() => {});
    await showDailyLogin(
      ctx,
      t('daily_claim_success', {
        amount: result.points_awarded,
        total: formatPoint(result.balance_point),
      }),
    );
  } catch (err) {
    const apiError = extractBackendApiError(err);
    if (apiError?.code === 'daily_already_claimed') {
      await ctx.answerCbQuery(t('daily_already_claimed'), { show_alert: true }).catch(() => {});
      return showDailyLogin(ctx);
    }
    ctx.answerCbQuery(resolveApiErrorMessage(t, apiError?.code), { show_alert: true }).catch(() => {});
  }
}

async function handleEnterPromo(ctx) {
  const t = i18n.getTranslator(ctx.from.id);
  await ctx.answerCbQuery(t('checkout_coming_soon'), { show_alert: true }).catch(() => {});
}

async function handleCopyReferral(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const info = await Referral.getReferralInfo(userId);
  if (!info?.referralCode) {
    return ctx.answerCbQuery(t('error'), { show_alert: true }).catch(() => {});
  }

  const refLink = buildReferralDeepLink(
    ctx.botInfo?.username || config.BOT_USERNAME,
    info.referralCode,
  );
  await ctx.answerCbQuery().catch(() => {});
  await ctx.reply(`${t('referral_link_label', { link: refLink })}\n\n${t('share_referral')}`, {
    reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'credits_menu' }]] },
  });
}

async function handleMyReferral(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const info = await Referral.getReferralInfo(userId);
  if (!info?.referralCode) {
    return editMsg(ctx, t('error'), [[{ text: t('back'), callback_data: 'credits_menu' }]]);
  }

  const refLink = buildReferralDeepLink(
    ctx.botInfo?.username || config.BOT_USERNAME,
    info.referralCode,
  );
  const text = `${t('my_referral_title')}\n━━━━━━━━━━━━━━━━━━━━━\n\n${t('referral_code_label', { code: info.referralCode })}\n\n${t('referral_link_label', { link: refLink })}\n\n${t('share_referral')}`;
  editMsg(ctx, text, [
    [{ text: t('copy_link_btn'), callback_data: 'copy_referral' }],
    [{ text: t('back'), callback_data: 'credits_menu' }],
  ]);
}

async function handleMyReferrals(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const info = await Referral.getReferralInfo(userId);
  if (!info) {
    return editMsg(ctx, t('error'), [[{ text: t('back'), callback_data: 'credits_menu' }]]);
  }

  let text = `${t('referrals_list_title')}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  if (!info.totalReferrals) {
    text += t('no_referrals');
  } else {
    text += `${t('referrals_total', { count: info.totalReferrals })}\n\n`;
    text += formatReferralsList(t, info.referrals);
  }
  editMsg(ctx, text, [[{ text: t('back'), callback_data: 'credits_menu' }]]);
}

async function handleEnterReferral(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const info = await Referral.getReferralInfo(userId);
  if (!info) {
    return editMsg(ctx, t('error'), [[{ text: t('back'), callback_data: 'credits_menu' }]]);
  }
  if (!info.canBind) {
    return editMsg(ctx, t('referral_already_bound'), [
      [{ text: t('back'), callback_data: 'credits_menu' }],
    ]);
  }

  userState.set(userId, { action: 'enter_referral', messageId: ctx.callbackQuery.message.message_id });
  editMsg(ctx, `${t('enter_referral_title')}\n━━━━━━━━━━━━━━━━━━━━━\n\n${t('enter_code_prompt')}`, [
    [{ text: t('cancel'), callback_data: 'credits_menu' }],
  ]);
}

function handleLanguageMenu(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  editMsg(ctx, t('language_title'), buildLanguagePickerKeyboard(userId, t));
}

async function handleLanguageSelect(ctx) {
  const userId = ctx.from.id;
  const langCode = ctx.callbackQuery.data.replace('lang_', '');
  if (langCode === 'menu') return;

  const saved = await BotLanguage.syncLanguage(userId, langCode);
  const t = i18n.getTranslator(userId);
  if (!saved.ok) {
    ctx.answerCbQuery(t('error'), { show_alert: true });
    return;
  }

  ctx.answerCbQuery(t('language_changed'));
  ctx.editMessageText(t('language_title'), {
    reply_markup: { inline_keyboard: buildLanguagePickerKeyboard(userId, t) },
  }).catch(() => {});
}

module.exports = { register, userState, presentHistoryHub, presentHistory, showPaymentScreen };
