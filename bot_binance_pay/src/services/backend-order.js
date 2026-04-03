const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function quoteTelegramOrder({ telegramId, variantId, quantity, couponCode = null, userCouponId = null }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const body = {
    telegram_id: telegramId,
    variant_id: variantId,
    quantity,
  };
  if (userCouponId) body.user_coupon_id = userCouponId;
  else if (couponCode) body.coupon_code = couponCode;
  const response = await client.post('/api/order/telegram/quote', body);
  return response?.data?.data ?? null;
}

async function getPendingTelegramOrder(telegramId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get('/api/order/telegram/pending', {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data ?? null;
}

async function cancelTelegramOrder({ telegramId, orderId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post('/api/order/telegram/cancel', {
    telegram_id: telegramId,
    order_id: orderId,
  });
  return response?.data?.data ?? null;
}

async function createTelegramOrder({
  telegramId,
  variantId,
  quantity,
  paymentMethod,
  couponCode = null,
  userCouponId = null,
}) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const body = {
    telegram_id: telegramId,
    variant_id: variantId,
    quantity,
    payment_method: paymentMethod,
  };
  if (userCouponId) body.user_coupon_id = userCouponId;
  else if (couponCode) body.coupon_code = couponCode;
  const response = await client.post('/api/order/telegram', body);
  return response?.data?.data ?? null;
}

async function getTelegramOrderPayment({ telegramId, orderId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get(`/api/order/telegram/${orderId}/payment`, {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data ?? null;
}

async function checkTelegramOrderPayment({ telegramId, orderId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.post(`/api/order/telegram/${orderId}/check-payment`, {
    telegram_id: telegramId,
  });
  return response?.data?.data ?? null;
}

async function listTelegramOrders({ telegramId, page = 1, limit = 10, status = null }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const params = { telegram_id: telegramId, page, limit };
  if (status) params.status = status;
  const response = await client.get('/api/order/telegram', {
    params,
  });
  return {
    items: response?.data?.data ?? [],
    meta: response?.data?.meta ?? { page, limit, total: 0, total_pages: 0 },
  };
}

async function getTelegramOrderDetail({ telegramId, orderId }) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get(`/api/order/telegram/${orderId}`, {
    params: { telegram_id: telegramId },
  });
  return response?.data?.data ?? null;
}

module.exports = {
  quoteTelegramOrder,
  getPendingTelegramOrder,
  cancelTelegramOrder,
  createTelegramOrder,
  getTelegramOrderPayment,
  checkTelegramOrderPayment,
  listTelegramOrders,
  getTelegramOrderDetail,
};
