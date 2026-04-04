const { createBackendClient, isBackendEnabled } = require('./backend-client');

async function listProductsForBot(categoryId = null, page = 1, limit = 20) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const params = { page, limit };
  if (categoryId != null) params.category_id = categoryId;
  const response = await client.get('/api/product/telegram/products', { params });
  return response?.data ?? null;
}

async function getProductDetail(productId) {
  if (!isBackendEnabled()) return null;
  const client = createBackendClient();
  const response = await client.get(`/api/product/telegram/products/${productId}`);
  return response?.data?.data ?? null;
}

module.exports = { listProductsForBot, getProductDetail };
