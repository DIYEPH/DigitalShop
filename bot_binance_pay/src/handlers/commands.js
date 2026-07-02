const config = require('../config');
const Wallet = require('../services/wallet');
const Referral = require('../services/referral');
const BackendAuth = require('../services/backend-auth');
const { buildDailyLoginScreen } = require('../utils/daily-login');
const { formatPrice, formatPoint, getFullName } = require('../utils/helpers');
const { buildMainMenuPayload } = require('../utils/mainMenu');
const { buildLanguagePickerKeyboard } = require('../utils/language-picker-keyboard');
const i18n = require('../locales');
const { presentHistoryHub } = require('./callbacks');
const { buildReferralDeepLink } = require('../utils/referral-ui');
const { resolveApiErrorMessage } = require('../utils/api-error-message');

function backToMainKeyboard(t) {
  return { inline_keyboard: [[{ text: t('back'), callback_data: 'back_main' }]] };
}

async function syncAuthOnStart(ctx) {
  const authData = await BackendAuth.telegramLogin({
    telegramId: ctx.from.id,
    username: ctx.from.username || '',
    fullName: getFullName(ctx.from),
  });
  const backendLang = BackendAuth.normalizeLanguage(authData?.user?.language);
  if (backendLang) i18n.setUserLang(ctx.from.id, backendLang);
}

async function tryBindReferralFromStart(ctx, code) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  try {
    const result = await Referral.processReferral(userId, code);
    if (result?.success) {
      await ctx.reply(
        t('referral_success', { name: result.referrer.first_name, amount: result.bonus }),
      );
    }
  } catch (err) {
    const { extractBackendApiError } = require('./error-middleware');
    const apiError = extractBackendApiError(err);
    if (apiError?.code === 'referral_already_bound') return;
    await ctx.reply(resolveApiErrorMessage(t, apiError?.code, { domain: 'referral' }));
  }
}

async function showMainMenu(ctx, includeWelcome = true) {
  const userId = ctx.from.id;
  const t = i18n.getTranslator(userId);
  let user = ctx.from;
  const me = await BackendAuth.getMe(userId);
  if (me?.user) {
    user = {
      ...ctx.from,
      balance_vnd: me.user.balanceVnd,
      balance_usdt: me.user.balanceUsdt,
      balance_point: me.user.balancePoint,
    };
  }

  const { text, keyboard } = await buildMainMenuPayload(user, t, {
    includeWelcome,
    langCode: i18n.getUserLang(userId),
  });

  await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
}

function register(bot) {
  bot.start(async (ctx) => {
    await syncAuthOnStart(ctx);
    const payload = String(ctx.startPayload || '').trim();
    if (payload.toUpperCase().startsWith('REF_')) {
      const code = payload.slice(4).trim();
      if (code) await tryBindReferralFromStart(ctx, code);
    }
    await showMainMenu(ctx, true);
  });

  bot.command('lang', async (ctx) => {
    const userId = ctx.from.id;
    const t = i18n.getTranslator(userId);
    await ctx.reply(t('language_title'), {
      reply_markup: { inline_keyboard: buildLanguagePickerKeyboard(userId, t) },
    });
  });

  bot.command('myid', async (ctx) => {
    await ctx.reply(`🔖 User ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
  });

  bot.command('balance', async (ctx) => {
    const userId = ctx.from.id;
    const t = i18n.getTranslator(userId);
    const wallet = await Wallet.getWallet(userId);
    if (!wallet) return ctx.reply(t('error'));

    const text = [
      t('balance_title'),
      '━━━━━━━━━━━━━━━━━━━━━',
      '',
      formatPrice(wallet.balance),
      formatPrice(wallet.balanceVnd, 'VNĐ'),
      formatPoint(wallet.balancePoint),
      '',
      `📊 ${t('stats_section')}`,
      t('balance_spent_label', { amount: formatPrice(wallet.balanceSpent) }),
      t('credits_spent_label', { amount: formatPoint(wallet.pointSpent) }),
    ].join('\n');

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('deposit_btn'), callback_data: 'deposit_menu' }],
          [{ text: t('credits_btn'), callback_data: 'credits_menu' }],
          [{ text: t('back'), callback_data: 'back_main' }],
        ],
      },
    });
  });

  bot.command('referral', async (ctx) => {
    const userId = ctx.from.id;
    const t = i18n.getTranslator(userId);
    const info = await Referral.getReferralInfo(userId);
    if (!info) return ctx.reply(t('error'));

    const refLink = buildReferralDeepLink(bot.botInfo?.username || config.BOT_USERNAME, info.referralCode);
    if (!refLink) return ctx.reply(t('error'));

    const text = [
      `🎁 ${t('referral_title')}`,
      '━━━━━━━━━━━━━━━━━━━━━',
      '',
      t('referral_code', { code: info.referralCode }),
      '',
      t('referral_link'),
      refLink,
      '',
      `📊 ${t('referral_stats')}`,
      t('total_referrals', { count: info.totalReferrals }),
      t('total_earned', { amount: formatPrice(info.totalEarned) }),
      '',
      `🎯 ${t('referral_rewards')}`,
      t('referrer_bonus', { amount: info.config.referrer_bonus }),
      t('referee_bonus', { amount: info.config.referee_bonus }),
    ].join('\n');

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t('copy_link_btn'), callback_data: 'copy_referral' }],
          [{ text: t('my_referrals_btn'), callback_data: 'my_referrals' }],
          [{ text: t('back'), callback_data: 'back_main' }],
        ],
      },
    });
  });

  async function replyDailyLogin(ctx) {
    const userId = ctx.from.id;
    const t = i18n.getTranslator(userId);
    const langCode = i18n.getUserLang(userId);
    try {
      const { text, keyboard } = await buildDailyLoginScreen(t, langCode, userId);
      await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
    } catch {
      await ctx.reply(t('error'), { reply_markup: backToMainKeyboard(t) });
    }
  }

  bot.command(['daily', 'checkin'], replyDailyLogin);

  bot.command('history', async (ctx) => {
    const userId = ctx.from.id;
    const t = i18n.getTranslator(userId);

    try {
      const view = await presentHistoryHub(ctx, t);
      await ctx.reply(view.text, {
        parse_mode: view.parseMode || undefined,
        reply_markup: { inline_keyboard: view.keyboard },
      });
    } catch {
      await ctx.reply(t('error'), { reply_markup: backToMainKeyboard(t) });
    }
  });
}

module.exports = { register, showMainMenu };
