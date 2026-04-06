const BackendCoupon = require('../services/backend-coupon');
const {
  formatCouponListMessage,
  buildMyCouponsHubKeyboard,
  buildMyCouponsListKeyboard,
  formatMyCouponsHubMessage,
} = require('./my-coupons');
const {
  formatCouponShopMessage,
  buildCouponShopKeyboard,
} = require('./coupon-shop');

async function loadMyCouponItems(telegramId, status, variantId = undefined) {
  const data = await BackendCoupon.listMyCoupons({
    telegramId,
    status,
    variantId,
  });
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

async function loadShopCouponItems() {
  const data = await BackendCoupon.listShopCoupons();
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

function buildMyCouponsHubScreen(t) {
  return {
    text: formatMyCouponsHubMessage(t),
    keyboard: buildMyCouponsHubKeyboard(t),
  };
}

function buildMyCouponsListScreen(items, t, group, introLine = '', checkoutCtx = null) {
  return {
    text: formatCouponListMessage(items, t, group, introLine),
    keyboard: buildMyCouponsListKeyboard(items, t, group, checkoutCtx),
  };
}

async function buildMyCouponsListScreenForUser(telegramId, t, group, introLine = '', checkoutCtx = null) {
  const variantId = checkoutCtx ? checkoutCtx.variantId : undefined;
  const items = await loadMyCouponItems(telegramId, group, variantId);
  return buildMyCouponsListScreen(items, t, group, introLine, checkoutCtx);
}

async function buildCouponShopScreen(t) {
  const items = await loadShopCouponItems();
  return {
    text: formatCouponShopMessage(items, t),
    keyboard: buildCouponShopKeyboard(items, t),
  };
}

module.exports = {
  loadMyCouponItems,
  loadShopCouponItems,
  buildMyCouponsHubScreen,
  buildMyCouponsListScreen,
  buildMyCouponsListScreenForUser,
  buildCouponShopScreen,
};
