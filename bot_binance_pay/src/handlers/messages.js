const BackendProduct = require('../services/backend-product');
const Referral = require('../services/referral');
const Events = require('../services/events');
const BackendWallet = require('../services/backend-wallet');
const { formatPrice } = require('../utils/helpers');
const {
  formatBinanceTopupMessage,
  formatBankTopupMessage,
  buildTopupKeyboard,
  presentTopupScreen,
} = require('../utils/deposit');
const { extractBackendApiError } = require('./error-middleware');
const { resolveApiErrorMessage } = require('../utils/api-error-message');
const { userState, showPaymentScreen } = require('./callbacks');
const { loadCheckoutProductVariant } = require('../utils/checkout');
const i18n = require('../locales');

function register(bot) {
  bot.on('message', async (ctx) => {
    const text = ctx.message?.text;
    if (!text || text.startsWith('/')) return;

    const userId = ctx.from.id;
    const state = userState.get(userId);
    if (state) return handleUserInput(ctx, state);
  });
}

async function handleUserInput(ctx, state) {
  switch (state.action) {
    case 'custom_qty':
      return handleCustomQuantity(ctx, state);
    case 'custom_topup_binance':
      return handleCustomTopupBinance(ctx, state);
    case 'custom_topup_bank':
      return handleCustomTopupBank(ctx, state);
    case 'enter_referral':
      return handleReferralCode(ctx, state);
    case 'enter_promo':
      return handlePromoCode(ctx, state);
    case 'enter_coupon':
      return handleEnterCoupon(ctx, state);
    default:
      userState.delete(ctx.from.id);
  }
}

async function handleCustomQuantity(ctx, state) {
  const { productId, variantId, stockCount } = state;
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const qty = parseInt(ctx.message.text.trim(), 10);
  const backCallback = `variant_${productId}_${variantId}`;

  if (isNaN(qty) || qty < 1) {
    return ctx.reply(t('invalid_quantity'), {
      reply_markup: { inline_keyboard: [[{ text: t('cancel'), callback_data: backCallback }]] },
    });
  }
  if (qty > stockCount) {
    return ctx.reply(t('not_enough_stock', { count: stockCount }), {
      reply_markup: { inline_keyboard: [[{ text: t('cancel'), callback_data: backCallback }]] },
    });
  }

  userState.delete(userId);

  const product = await BackendProduct.getProductDetail(productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!variant) return ctx.reply(t('product_not_found'));

  await showPaymentScreen(ctx, product, variant, qty, t, langCode, null);
}

async function handleCustomTopupBinance(ctx, state) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const amount = parseFloat(ctx.message.text.trim());

  if (isNaN(amount) || amount < 0.01) {
    return ctx.reply(t('min_amount', { amount: '0.01 USDT' }), {
      reply_markup: { inline_keyboard: [[{ text: t('cancel'), callback_data: 'deposit_menu' }]] },
    });
  }

  userState.delete(userId);
  return createTopupFromMessage(ctx, userId, amount, 'binance', t);
}

async function handleCustomTopupBank(ctx, state) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const amount = Math.round(parseFloat(ctx.message.text.trim().replace(/[^\d.]/g, '')));

  if (!Number.isFinite(amount) || amount <= 0) {
    return ctx.reply(t('invalid_amount'), {
      reply_markup: { inline_keyboard: [[{ text: t('cancel'), callback_data: 'deposit_menu' }]] },
    });
  }

  userState.delete(userId);
  return createTopupFromMessage(ctx, userId, amount, 'bank', t);
}

async function createTopupFromMessage(ctx, userId, amount, method, t) {
  try {
    const topup =
      method === 'bank'
        ? await BackendWallet.createBankTopup({ telegramId: userId, amount })
        : await BackendWallet.createBinanceTopup({ telegramId: userId, amount });
    if (!topup) throw new Error('create_failed');

    const text =
      method === 'bank' ? formatBankTopupMessage(topup, t) : formatBinanceTopupMessage(topup, t);
    const keyboard = buildTopupKeyboard(topup.topup_id, t);
    await presentTopupScreen(ctx, topup, text, keyboard);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    const message = resolveApiErrorMessage(t, apiError?.code, { domain: 'topup', method });
    await ctx.reply(message, {
      reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'deposit_menu' }]] },
    });
  }
}

async function handleReferralCode(ctx) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const code = ctx.message.text.trim().toUpperCase();
  userState.delete(userId);

  const info = await Referral.getReferralInfo(userId);
  if (!info?.canBind) {
    return ctx.reply(t('referral_already_bound'), {
      reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'credits_menu' }]] },
    });
  }

  try {
    const result = await Referral.processReferral(userId, code);
    await ctx.reply(t('referral_success', { name: result.referrer.first_name, amount: result.bonus }), {
      reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'credits_menu' }]] },
    });
  } catch (err) {
    const apiError = extractBackendApiError(err);
    await ctx.reply(resolveApiErrorMessage(t, apiError?.code, { domain: 'referral' }), {
      reply_markup: { inline_keyboard: [[{ text: t('back'), callback_data: 'credits_menu' }]] },
    });
  }
}

async function handleEnterCoupon(ctx, state) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  const langCode = i18n.getUserLang(userId);
  const code = ctx.message.text.trim().toUpperCase();
  const { productId, variantId, quantity } = state;

  const loaded = await loadCheckoutProductVariant(productId, variantId);
  if (!loaded) {
    userState.delete(userId);
    return ctx.reply(t('product_not_found'));
  }

  try {
    await showPaymentScreen(ctx, loaded.product, loaded.variant, quantity, t, langCode, code);
  } catch (err) {
    const apiError = extractBackendApiError(err);
    const message = resolveApiErrorMessage(t, apiError?.code);
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [[{ text: t('cancel'), callback_data: `qty_${productId}_${variantId}_${quantity}` }]],
      },
    });
  }
}

async function handlePromoCode(ctx) {
  const userId = ctx.from.id;
  const code = ctx.message.text.trim().toUpperCase();
  userState.delete(userId);

  const result = await Events.claimPromoCode(userId, code);
  if (result.success) {
    await ctx.reply(`✅ ${result.message}`, {
      reply_markup: { inline_keyboard: [[{ text: '◀️ Back', callback_data: 'credits_menu' }]] },
    });
  } else {
    await ctx.reply(`❌ ${result.message}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Try again', callback_data: 'enter_promo' }, { text: '◀️ Back', callback_data: 'credits_menu' }],
        ],
      },
    });
  }
}

module.exports = { register };
