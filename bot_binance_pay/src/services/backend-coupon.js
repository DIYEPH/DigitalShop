const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function listMyCoupons({ telegramId, status = 'active', variantId = null }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const params = { telegram_id: telegramId, status };
  if (variantId) params.variant_id = variantId;
  const response = await client.get('/api/coupon/telegram/mine', { params });
  return response?.data?.data ?? null;
}

async function listShopCoupons() {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get('/api/coupon/telegram/shop');
  return response?.data?.data ?? null;
}

async function redeemShopCoupon({ telegramId, code }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/coupon/telegram/redeem', {
    telegram_id: telegramId,
    code,
  });
  return response?.data?.data ?? null;
}

module.exports = {
  listMyCoupons,
  listShopCoupons,
  redeemShopCoupon,
};
