const config = require('../config');
const BackendProduct = require('../services/backend-product');
const { getFullName, getAdminUsername, formatPrice, formatPoint } = require('./helpers');
const { buildShopKeyboard } = require('./keyboard');

async function buildMainMenuPayload(user, t, options = {}) {
  const includeWelcome = options.includeWelcome === undefined || options.includeWelcome === true;
  const langCode = options.langCode || 'vi';

  const result = await BackendProduct.listProductsForBot(null);
  const products = result?.data?.items ?? [];

  const keyboard = buildShopKeyboard(products, t, getAdminUsername(), langCode);

  const headerLines = includeWelcome
    ? [
        t('shop_name', { name: config.SHOP_NAME }),
        '-ˋˏ✄┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
        '',
        t('welcome', { name: getFullName(user) }),
        '',
        t('total_assets_title'),
        `ㅤ- ${formatPrice(user?.balance_vnd, 'VNĐ')}`,
        `ㅤ- ${formatPrice(user?.balance_usdt, 'USDT')}`,
        `ㅤ- ${formatPoint(user?.balance_point)}`,
        '',
      ]
    : [
        t('shop_name', { name: config.SHOP_NAME }),
        '-ˋˏ✄┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈',
      ];

  const text = [
    ...headerLines,
    products.length > 0 ? t('select_product') : t('no_products'),
  ].join('\n');

  return { text, keyboard };
}

module.exports = { buildMainMenuPayload };
