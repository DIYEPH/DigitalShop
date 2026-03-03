/**
 * E2E: Product + Order quote (cần Postgres đã seed).
 * Chạy: npm run db:fresh && npm run test:e2e
 */
import path from 'path';
import assert from 'assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { SepayTransaction } from '../../src/integration/bank/sepay.gateway';
import { Pool } from 'pg';
import request from 'supertest';
import { config } from 'dotenv';
import { botHeaders, createTestApp } from '../helpers/create-test-app';
import {
  backdateOrderCreatedAt,
  cancelPendingOrdersForTelegram,
  cancelPendingTopupsForTelegram,
  countAvailableStock,
  countReservedStockForOrder,
  createE2ePool,
  fetchOrderDb,
  getUserBalance,
  getUserBalancePoint,
  clearDailyLoginClaimsForTelegram,
  clearReferralBindingForTelegram,
  getReferralCodeForTelegram,
  restoreSeedStockForVariant,
  restoreSeedVariantPaymentMethods,
  setUserBalance,
  setVariantPaymentMethods,
} from '../helpers/order-e2e-db';
import { ORDER_REPOSITORY } from '../../src/modules/order/order.tokens';

config({ path: path.resolve(__dirname, '../../.env') });
process.env.PENDING_ORDER_SYNC_ENABLED = 'false';

const hasDb = Boolean(process.env.DATABASE_URL);
const seedUserTelegramId = Number(process.env.SEED_USER_TELEGRAM_ID || 900000002);
const seedAdminTelegramId = Number(process.env.SEED_ADMIN_TELEGRAM_ID || 900000001);

describe('Telegram bot API (e2e)', { skip: !hasDb }, () => {
  let app: INestApplication;

  before(async () => {
    app = await createTestApp();
    if (!process.env.DATABASE_URL) return;
    const pool = createE2ePool();
    try {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);
      const variantRes = await pool.query<{ id: number }>(
        `SELECT id FROM product_variants WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`,
      );
      if (variantRes.rows[0]?.id) {
        await restoreSeedStockForVariant(pool, variantRes.rows[0].id);
      }
    } finally {
      await pool.end();
    }
  });

  after(async () => {
    await app?.close();
  });

  describe('ProductModule', () => {
    test('GET /product/telegram/products — thiếu secret → 401', async () => {
      await request(app.getHttpServer()).get('/api/product/telegram/products').expect(401);
    });

    test('GET /product/telegram/products — có secret → 200 + items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/product/telegram/products')
        .set(botHeaders())
        .expect(200);

      assert.ok(Array.isArray(res.body?.data?.items));
      assert.ok(res.body.data.items.length >= 1);
      const first = res.body.data.items[0];
      assert.equal(typeof first.id, 'number');
      assert.equal(typeof first.name_en, 'string');
      assert.equal(typeof first.min_price_usdt, 'number');
    });

    test('GET /product/telegram/products/:id — variant + payment_methods', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/product/telegram/products')
        .set(botHeaders())
        .expect(200);
      const productId = list.body.data.items[0].id;

      const res = await request(app.getHttpServer())
        .get(`/api/product/telegram/products/${productId}`)
        .set(botHeaders())
        .expect(200);

      assert.ok(res.body?.data);
      assert.ok(Array.isArray(res.body.data.variants));
      assert.ok(res.body.data.variants.length >= 1);
      const variant = res.body.data.variants[0];
      assert.ok(Array.isArray(variant.payment_methods));
      assert.ok(variant.payment_methods.length >= 1);
      assert.equal(typeof variant.amount_usdt, 'number');
    });

    test('route cũ /category/telegram/products → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/category/telegram/products')
        .set(botHeaders())
        .expect(404);
    });
  });

  describe('OrderModule — quote', () => {
    test('POST /order/telegram/quote — thiếu secret → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .send({ telegram_id: seedUserTelegramId, variant_id: 1, quantity: 1 })
        .expect(401);
    });

    test('POST /order/telegram/quote — qty=1 không coupon', async () => {
      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      const variantId = detail.body.data.variants[0].id;

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
        })
        .expect(201);

      const data = res.body.data;
      assert.equal(data.quantity, 1);
      assert.equal(data.unit_price_usdt, 4.99);
      assert.equal(data.total_usdt, 4.99);
      assert.equal(data.coupon_applied, null);
      assert.ok(data.payment_methods.includes('BINANCE'));
    });

    test('POST /order/telegram/quote — WELCOME10 giảm 10%', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: 1,
          quantity: 2,
          coupon_code: 'WELCOME10',
        })
        .expect(201);

      const data = res.body.data;
      assert.equal(data.subtotal_usdt, 9.98);
      assert.equal(data.coupon_applied, 'WELCOME10');
      assert.equal(data.discount_usdt, 1);
      assert.equal(data.total_usdt, 8.98);
    });

    test('POST /order/telegram/quote — insufficient_stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: 1,
          quantity: 999,
        })
        .expect(400);

      assert.equal(res.body?.error?.code, 'insufficient_stock');
    });

    test('POST /order/telegram/quote — coupon_limit_exceeded', async () => {
      if (!process.env.DATABASE_URL) return;
      const pool = createE2ePool();
      try {
        await pool.query(
          `INSERT INTO coupons (code, variant_id, discount_type, percent_bps, cost_point, visibility, max_redemptions)
           VALUES ('E2E_ONCE', 1, 'PERCENT', 500, 0, 'PUBLIC', 1)
           ON CONFLICT (code) DO UPDATE
           SET max_redemptions = 1, per_user_limit = NULL, is_active = TRUE, variant_id = 1`,
        );
        await pool.query(
          `INSERT INTO orders (user_id, total_price, currency, payment_method, coupon_id, status)
           SELECT u.id, 1, 'USDT', 'BALANCE', c.id, 'DELIVERED'
             FROM users u, coupons c
            WHERE u.telegram_id = $1 AND c.code = 'E2E_ONCE'`,
          [seedUserTelegramId],
        );

        const res = await request(app.getHttpServer())
          .post('/api/order/telegram/quote')
          .set(botHeaders())
          .send({
            telegram_id: seedUserTelegramId,
            variant_id: 1,
            quantity: 1,
            coupon_code: 'E2E_ONCE',
          })
          .expect(400);

        assert.equal(res.body?.error?.code, 'coupon_limit_exceeded');
      } finally {
        await pool.query(`DELETE FROM orders WHERE coupon_id = (SELECT id FROM coupons WHERE code = 'E2E_ONCE')`);
        await pool.query(`DELETE FROM coupons WHERE code = 'E2E_ONCE'`);
        await pool.end();
      }
    });

    test('POST /order/telegram/quote — coupon_invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: 1,
          quantity: 1,
          coupon_code: 'NOT_A_REAL_CODE',
        })
        .expect(400);

      assert.equal(res.body?.error?.code, 'coupon_invalid');
    });

    test('POST /order/telegram/quote — user_not_found', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: 999999999,
          variant_id: 1,
          quantity: 1,
        })
        .expect(404);

      assert.equal(res.body?.error?.code, 'user_not_found');
    });
  });

  describe('OrderModule — create', () => {
    let pool: Pool;
    let variantId: number;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;
      await restoreSeedStockForVariant(pool, variantId);
    });

    after(async () => {
      if (pool) {
        await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
        await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);
        if (variantId) {
          await restoreSeedStockForVariant(pool, variantId);
          await restoreSeedVariantPaymentMethods(pool, variantId);
        }
        await pool.end();
      }
    });

    test('POST /order/telegram — thiếu secret → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/order/telegram')
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(401);
    });

    test('POST /order/telegram — BINANCE: PENDING + reserve stock (AVAILABLE giảm)', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);
      const stockBefore = await countAvailableStock(pool, variantId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);

      const data = res.body.data;
      assert.ok(data.order_id);
      assert.match(data.payment_code, /^[A-Z0-9]{8}$/);
      assert.equal(data.status, 'PENDING');

      const db = await fetchOrderDb(pool, data.order_id);
      assert.equal(db.order.status, 'PENDING');
      assert.equal(db.items[0].snapshot_fulfillment_type, 'IN_STOCK');

      const stockAfter = await countAvailableStock(pool, variantId);
      assert.equal(stockAfter, stockBefore - 1);
      assert.equal(await countReservedStockForOrder(pool, data.order_id), 1);

      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      assert.equal(await countAvailableStock(pool, variantId), stockBefore);
    });

    test('expireTimedPendingOrders — quá hạn tự CANCELLED + release stock (không cần user gọi API)', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      const stockBefore = await countAvailableStock(pool, variantId);

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);

      const orderId = created.body.data.order_id as string;
      assert.equal(await countReservedStockForOrder(pool, orderId), 1);

      await backdateOrderCreatedAt(pool, orderId, 11);

      const repo = app.get(ORDER_REPOSITORY);
      const { cancelledCount } = await repo.expireTimedPendingOrders();
      assert.equal(cancelledCount, 1);

      const db = await fetchOrderDb(pool, orderId);
      assert.equal(db.order.status, 'CANCELLED');
      assert.equal(await countReservedStockForOrder(pool, orderId), 0);
      assert.equal(await countAvailableStock(pool, variantId), stockBefore);

      const pending = await request(app.getHttpServer())
        .get('/api/order/telegram/pending')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);
      assert.equal(pending.body.data, null);
    });

    test('POST /order/telegram — 2 user cùng mua 1 slot: user thứ 2 insufficient_stock', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);

      await pool.query(
        `UPDATE stock_items
          SET status = 'DELIVERED', order_id = NULL, is_locked = false, reserved_at = NULL
          WHERE id IN (
            SELECT id FROM stock_items
            WHERE variant_id = $1 AND status = 'AVAILABLE'
            ORDER BY created_at ASC
            OFFSET 1
          )`,
        [variantId],
      );
      assert.equal(await countAvailableStock(pool, variantId), 1, 'test cần đúng 1 slot AVAILABLE');

      await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedAdminTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(400);

      assert.equal(second.body?.error?.code, 'insufficient_stock');

      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
    });

    test('POST /order/telegram — BANK → currency VND + expires ~10 phút', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BANK',
        })
        .expect(201);

      assert.equal(res.body.data.currency, 'VND');
      assert.equal(res.body.data.total_price, 129000);
      assert.ok(res.body.data.expires_at);
      assert.ok(res.body.data.seconds_left > 0);
    });

    test('POST /order/telegram — BALANCE → USDT, DELIVERED ngay (không expires)', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await restoreSeedStockForVariant(pool, variantId);
      await setUserBalance(pool, seedUserTelegramId, 50, 200000);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE',
        })
        .expect(201);

      assert.equal(res.body.data.currency, 'USDT');
      assert.equal(res.body.data.total_price, 4.99);
      assert.equal(res.body.data.status, 'DELIVERED');
      assert.equal(res.body.data.expires_at, null);
      assert.ok(Array.isArray(res.body.data.delivery_lines));
    });

    test('POST /order/telegram — BALANCE_VND → currency VND, DELIVERED ngay', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await restoreSeedStockForVariant(pool, variantId);
      await setUserBalance(pool, seedUserTelegramId, 50, 200000);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE_VND',
        })
        .expect(201);

      assert.equal(res.body.data.currency, 'VND');
      assert.equal(res.body.data.total_price, 129000);
      assert.equal(res.body.data.status, 'DELIVERED');
    });

    test('POST /order/telegram — WELCOME10 giảm giá khi create', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await restoreSeedStockForVariant(pool, variantId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
          coupon_code: 'WELCOME10',
        })
        .expect(201);

      assert.equal(res.body.data.total_price, 4.49);
    });

    test('POST /order/telegram — pending BINANCE → 409 khi tạo thêm (mọi method)', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await restoreSeedStockForVariant(pool, variantId);

      await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);

      const resBinance = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(409);
      assert.equal(resBinance.body?.error?.code, 'pending_order_exists');
      assert.ok(resBinance.body?.error?.details?.order?.order_id);

      const resBank = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BANK',
        })
        .expect(409);
      assert.equal(resBank.body?.error?.code, 'pending_order_exists');
    });

    test('POST /order/telegram — payment_method_invalid khi variant không có method', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await setVariantPaymentMethods(pool, variantId, ['BINANCE']);

      try {
        const res = await request(app.getHttpServer())
          .post('/api/order/telegram')
          .set(botHeaders())
          .send({
            telegram_id: seedUserTelegramId,
            variant_id: variantId,
            quantity: 1,
            payment_method: 'BANK',
          })
          .expect(400);

        assert.equal(res.body?.error?.code, 'payment_method_invalid');
      } finally {
        await restoreSeedVariantPaymentMethods(pool, variantId);
      }
    });

    test('POST /order/telegram — insufficient_stock', async () => {
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 999,
          payment_method: 'BINANCE',
        })
        .expect(400);

      assert.equal(res.body?.error?.code, 'insufficient_stock');
    });

    test('POST /order/telegram — user_not_found', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: 999999999,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(404);

      assert.equal(res.body?.error?.code, 'user_not_found');
    });

    test('POST /order/telegram — variant_not_found', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: 999999,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(404);

      assert.equal(res.body?.error?.code, 'variant_not_found');
    });
  });

  describe('OrderModule — pending & cancel', () => {
    let pool: Pool;
    let variantId: number;
    let pendingOrderId: string;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);
      pendingOrderId = created.body.data.order_id;
    });

    after(async () => {
      if (pool) {
        await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
        await pool.end();
      }
    });

    test('GET /order/telegram/pending — trả đơn PENDING + seconds_left', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram/pending')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.ok(res.body.data);
      assert.equal(res.body.data.order_id, pendingOrderId);
      assert.equal(res.body.data.status, 'PENDING');
      assert.ok(res.body.data.item_name);
      assert.ok(res.body.data.seconds_left > 0);
    });

    test('POST /order/telegram/cancel — hủy PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/cancel')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          order_id: pendingOrderId,
        })
        .expect(201);

      assert.equal(res.body.data.order_id, pendingOrderId);
      assert.equal(res.body.data.status, 'CANCELLED');

      const db = await fetchOrderDb(pool, pendingOrderId);
      assert.equal(db.order.status, 'CANCELLED');
    });

    test('GET /order/telegram/pending — sau cancel → null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram/pending')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data, null);
    });

    test('POST /order/telegram/cancel — đơn đã hủy → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/cancel')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          order_id: pendingOrderId,
        })
        .expect(404);

      assert.equal(res.body?.error?.code, 'order_not_cancellable');
    });
  });

  describe('OrderModule — Bank payment (07)', () => {
    let pool: Pool;
    let variantId: number;
    let orderId: string;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;
      await restoreSeedStockForVariant(pool, variantId);

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BANK',
        })
        .expect(201);
      orderId = created.body.data.order_id;
    });

    after(async () => {
      if (pool) {
        await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
        if (variantId) await restoreSeedStockForVariant(pool, variantId);
        await pool.end();
      }
    });

    test('GET /order/telegram/:id/payment — PENDING BANK + transfer fields', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${orderId}/payment`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data.order_id, orderId);
      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.payment_method, 'BANK');
      assert.equal(res.body.data.currency, 'VND');
      assert.ok(res.body.data.payment_code);
      assert.ok(res.body.data.seconds_left > 0);
      assert.ok('bank_name' in res.body.data);
      assert.ok('vietqr_url' in res.body.data);
    });

    test('POST /order/telegram/:id/check-payment — chưa có tx SePay → vẫn PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/order/telegram/${orderId}/check-payment`)
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(201);

      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.delivery_lines, null);
    });
  });

  describe('OrderModule — Binance payment (06)', () => {
    let pool: Pool;
    let variantId: number;
    let orderId: string;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;
      await restoreSeedStockForVariant(pool, variantId);

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);
      orderId = created.body.data.order_id;
    });

    after(async () => {
      if (pool) {
        await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
        await cancelPendingOrdersForTelegram(pool, seedAdminTelegramId);
        if (variantId) await restoreSeedStockForVariant(pool, variantId);
        await pool.end();
      }
    });

    test('GET /order/telegram/:id/payment — PENDING + payment_code', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${orderId}/payment`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data.order_id, orderId);
      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.payment_method, 'BINANCE');
      assert.equal(res.body.data.currency, 'USDT');
      assert.ok(res.body.data.payment_code);
      assert.ok(res.body.data.seconds_left > 0);
      assert.ok('binance_qr_url' in res.body.data);
    });

    test('POST /order/telegram/:id/check-payment — chưa có tx → vẫn PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/order/telegram/${orderId}/check-payment`)
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(201);

      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.delivery_lines, null);
    });

    test('GET /order/telegram/:id/payment — user khác → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${orderId}/payment`)
        .set(botHeaders())
        .query({ telegram_id: 999999998 })
        .expect(404);

      assert.equal(res.body?.error?.code, 'order_not_found');
    });

    test('POST check-payment + deliver — PAID → DELIVERED + delivery_lines', async () => {
      const stockBefore = await countAvailableStock(pool, variantId);
      assert.ok(stockBefore >= 1);

      await pool.query(
        `UPDATE orders SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
          WHERE id = $1::uuid`,
        [orderId],
      );

      const check = await request(app.getHttpServer())
        .post(`/api/order/telegram/${orderId}/check-payment`)
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(201);

      assert.equal(check.body.data.status, 'DELIVERED');
      assert.ok(Array.isArray(check.body.data.delivery_lines));
      assert.ok(check.body.data.delivery_lines.length >= 1);

      const db = await fetchOrderDb(pool, orderId);
      assert.equal(db.order.status, 'DELIVERED');

      const deliveredStock = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM stock_items
          WHERE order_id = $1::uuid AND status = 'DELIVERED'`,
        [orderId],
      );
      assert.ok(Number(deliveredStock.rows[0]?.count ?? 0) >= 1);
    });
  });

  describe('OrderModule — Balance checkout (08)', () => {
    let pool: Pool;
    let variantId: number;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;
      await restoreSeedStockForVariant(pool, variantId);
    });

    after(async () => {
      if (pool) {
        await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
        if (variantId) await restoreSeedStockForVariant(pool, variantId);
        await setUserBalance(pool, seedUserTelegramId, 0, 0);
        await pool.end();
      }
    });

    test('POST /order/telegram BALANCE — thiếu USDT → 400 insufficient_balance_usdt', async () => {
      await setUserBalance(pool, seedUserTelegramId, 0, 0);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE',
        })
        .expect(400);

      assert.equal(res.body?.error?.code, 'insufficient_balance_usdt');
    });

    test('POST /order/telegram BALANCE — đủ USDT → DELIVERED + delivery_lines + trừ balance', async () => {
      const stockBefore = await countAvailableStock(pool, variantId);
      assert.ok(stockBefore >= 1, 'cần ít nhất 1 stock');

      await setUserBalance(pool, seedUserTelegramId, 9999, 0);
      const balBefore = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balBefore);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE',
        })
        .expect(201);

      assert.equal(res.body.data.status, 'DELIVERED');
      assert.equal(res.body.data.payment_method, 'BALANCE');
      assert.equal(res.body.data.currency, 'USDT');
      assert.equal(res.body.data.payment_code, null);
      assert.equal(res.body.data.expires_at, null);
      assert.ok(Array.isArray(res.body.data.delivery_lines));
      assert.ok(res.body.data.delivery_lines.length >= 1);

      const balAfter = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balAfter);
      assert.ok(balAfter.balanceUsdt < balBefore.balanceUsdt, 'balance_usdt phải bị trừ');

      const stockAfter = await countAvailableStock(pool, variantId);
      assert.equal(stockAfter, stockBefore - 1);
    });

    test('POST /order/telegram BALANCE_VND — thiếu VNĐ → 400 insufficient_balance_vnd', async () => {
      await setUserBalance(pool, seedUserTelegramId, 9999, 0);
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE_VND',
        })
        .expect(400);

      assert.equal(res.body?.error?.code, 'insufficient_balance_vnd');
    });

    test('POST /order/telegram BALANCE_VND — đủ VNĐ → DELIVERED + delivery_lines + trừ balance_vnd', async () => {
      await restoreSeedStockForVariant(pool, variantId);
      const stockBefore = await countAvailableStock(pool, variantId);
      assert.ok(stockBefore >= 1);

      await setUserBalance(pool, seedUserTelegramId, 9999, 99_000_000);
      const balBefore = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balBefore);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE_VND',
        })
        .expect(201);

      assert.equal(res.body.data.status, 'DELIVERED');
      assert.equal(res.body.data.payment_method, 'BALANCE_VND');
      assert.equal(res.body.data.currency, 'VND');
      assert.equal(res.body.data.payment_code, null);
      assert.ok(Array.isArray(res.body.data.delivery_lines));
      assert.ok(res.body.data.delivery_lines.length >= 1);

      const balAfter = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balAfter);
      assert.ok(balAfter.balanceVnd < balBefore.balanceVnd, 'balance_vnd phải bị trừ');

      const stockAfter = await countAvailableStock(pool, variantId);
      assert.equal(stockAfter, stockBefore - 1);
    });
  });

  describe('OrderModule — list & detail (12)', () => {
    let pool: Pool;
    let variantId: number;
    let deliveredOrderId: string;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const detail = await request(app.getHttpServer())
        .get('/api/product/telegram/products/1')
        .set(botHeaders())
        .expect(200);
      variantId = detail.body.data.variants[0].id;
      await restoreSeedStockForVariant(pool, variantId);
      await setUserBalance(pool, seedUserTelegramId, 9999, 99_000_000);

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BALANCE',
        })
        .expect(201);
      deliveredOrderId = created.body.data.order_id;
    });

    after(async () => {
      if (pool) await pool.end();
    });

    test('GET /order/telegram — danh sách đơn của user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId, page: 1, limit: 10 })
        .expect(200);

      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.meta.total >= 1);
      assert.equal(res.body.meta.limit, 10);
      const found = res.body.data.find((o: { order_id: string }) => o.order_id === deliveredOrderId);
      assert.ok(found);
      assert.equal(found.status, 'DELIVERED');
      assert.ok(found.first_item_name);
      assert.ok(found.created_at);
    });

    test('GET /order/telegram?status=completed — chỉ DELIVERED/PAID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId, status: 'completed', limit: 50 })
        .expect(200);

      assert.ok(res.body.data.length >= 1);
      for (const o of res.body.data) {
        assert.ok(['DELIVERED', 'PAID'].includes(o.status));
      }
    });

    test('GET /order/telegram?status=cancelled — chỉ CANCELLED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId, status: 'cancelled', limit: 50 })
        .expect(200);

      for (const o of res.body.data) {
        assert.equal(o.status, 'CANCELLED');
      }
    });

    test('GET /order/telegram?status=pending — chỉ PENDING', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId, status: 'pending', limit: 50 })
        .expect(200);

      for (const o of res.body.data) {
        assert.equal(o.status, 'PENDING');
      }
    });

    test('GET /order/telegram/:id — chi tiết + delivery lines', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${deliveredOrderId}`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data.order_id, deliveredOrderId);
      assert.equal(res.body.data.status, 'DELIVERED');
      assert.ok(Array.isArray(res.body.data.items));
      assert.ok(res.body.data.items.length >= 1);
      assert.ok(Array.isArray(res.body.data.delivery.lines));
      assert.ok(res.body.data.delivery.lines.length >= 1);
    });

    test('GET /order/telegram/:id — user khác → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${deliveredOrderId}`)
        .set(botHeaders())
        .query({ telegram_id: seedAdminTelegramId })
        .expect(404);

      assert.equal(res.body?.error?.code, 'order_not_found');
    });

    test('GET /order/telegram — user_not_found', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram')
        .set(botHeaders())
        .query({ telegram_id: 999999999, page: 1, limit: 10 })
        .expect(404);

      assert.equal(res.body?.error?.code, 'user_not_found');
    });

    test('GET /order/telegram/:id — order_id không hợp lệ → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/order/telegram/not-a-uuid')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(400);

      assert.ok(res.body?.message || res.body?.statusCode === 400);
    });

    test('GET /order/telegram/:id — PENDING BINANCE có expires_at + seconds_left', async () => {
      if (!pool) return;

      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);

      const created = await request(app.getHttpServer())
        .post('/api/order/telegram')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          payment_method: 'BINANCE',
        })
        .expect(201);

      const pendingId = created.body.data.order_id;

      const res = await request(app.getHttpServer())
        .get(`/api/order/telegram/${pendingId}`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data.status, 'PENDING');
      assert.equal(res.body.data.payment_method, 'BINANCE');
      assert.ok(res.body.data.expires_at);
      assert.ok(res.body.data.seconds_left > 0);
      assert.ok(res.body.data.created_at);

      await cancelPendingOrdersForTelegram(pool, seedUserTelegramId);
      await restoreSeedStockForVariant(pool, variantId);
    });
  });

  describe('WalletModule — Bank topup (11)', () => {
    let pool: Pool;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
    });

    beforeEach(async () => {
      if (pool) await cancelPendingTopupsForTelegram(pool, seedUserTelegramId);
    });

    after(async () => {
      if (pool) {
        await cancelPendingTopupsForTelegram(pool, seedUserTelegramId);
        await pool.end();
      }
    });

    test('POST /wallet/telegram/topup/bank — tạo PENDING + VietQR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/wallet/telegram/topup/bank')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, amount: 200_000 })
        .expect(201);

      assert.equal(res.body.data.provider, 'BANK');
      assert.equal(res.body.data.currency, 'VND');
      assert.equal(res.body.data.amount, 200_000);
      assert.equal(res.body.data.status, 'PENDING');
      assert.ok(res.body.data.payment_code);
      assert.ok(res.body.data.seconds_left > 0);
      assert.ok('vietqr_url' in res.body.data);
      assert.ok('bank_account' in res.body.data);
    });

    test('GET /wallet/telegram/topup/:id/status — chưa có tx SePay → PENDING', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/wallet/telegram/topup/bank')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, amount: 100_000 })
        .expect(201);

      const topupId = created.body.data.topup_id;

      const status = await request(app.getHttpServer())
        .get(`/api/wallet/telegram/topup/${topupId}/status`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(status.body.data.status, 'PENDING');
      assert.equal(status.body.data.provider, 'BANK');

      await cancelPendingTopupsForTelegram(pool, seedUserTelegramId);
    });

    test('POST /wallet/telegram/topup/bank — amount < 10000 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/wallet/telegram/topup/bank')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, amount: 1000 })
        .expect(400);

      assert.equal(res.body?.error?.code, 'invalid_amount');
    });
  });

  describe('WalletModule — Bank topup SePay confirm (11)', () => {
    let pool: Pool;
    let mockApp: INestApplication;
    let sepayTransactions: SepayTransaction[] = [];

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      mockApp = await createTestApp({ sepayTransactions: () => sepayTransactions });
    });

    beforeEach(async () => {
      sepayTransactions = [];
      if (pool) await cancelPendingTopupsForTelegram(pool, seedUserTelegramId);
    });

    after(async () => {
      await mockApp?.close();
      if (pool) {
        await cancelPendingTopupsForTelegram(pool, seedUserTelegramId);
        await pool.end();
      }
    });

    test('GET /status — SePay khớp → CONFIRMED + balance_vnd +200000', async () => {
      const balBefore = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balBefore);

      const created = await request(mockApp.getHttpServer())
        .post('/api/wallet/telegram/topup/bank')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, amount: 200_000 })
        .expect(201);

      const topupId = created.body.data.topup_id;
      const paymentCode = created.body.data.payment_code;

      const sepayTxId = `e2e-topup-${topupId}`;
      sepayTransactions = [
        {
          id: sepayTxId,
          transaction_content: `CK ${paymentCode} nap`,
          amount_in: 200_000,
          transaction_date: new Date().toISOString(),
        },
      ];

      const status = await request(mockApp.getHttpServer())
        .get(`/api/wallet/telegram/topup/${topupId}/status`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(status.body.data.status, 'CONFIRMED');
      assert.equal(status.body.data.amount, 200_000);

      const balAfter = await getUserBalance(pool, seedUserTelegramId);
      assert.ok(balAfter);
      assert.equal(balAfter.balanceVnd, balBefore.balanceVnd + 200_000);

      const row = await pool.query<{ status: string; tx_id: string | null }>(
        `SELECT status::text, tx_id FROM balance_topups WHERE id = $1`,
        [topupId],
      );
      assert.equal(row.rows[0]?.status, 'CONFIRMED');
      assert.ok(row.rows[0]?.tx_id);

      const statusAgain = await request(mockApp.getHttpServer())
        .get(`/api/wallet/telegram/topup/${topupId}/status`)
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(statusAgain.body.data.status, 'CONFIRMED');
      const balSame = await getUserBalance(pool, seedUserTelegramId);
      assert.equal(balSame?.balanceVnd, balAfter.balanceVnd, 'không cộng đôi khi check lại');
    });
  });

  describe('PointModule — daily login (14)', () => {
    let pool: Pool;
    const dailyTz = process.env.DAILY_LOGIN_TIMEZONE?.trim() || 'Asia/Ho_Chi_Minh';

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
    });

    beforeEach(async () => {
      if (pool) await clearDailyLoginClaimsForTelegram(pool, seedUserTelegramId);
    });

    after(async () => {
      if (pool) {
        await clearDailyLoginClaimsForTelegram(pool, seedUserTelegramId);
        await pool.end();
      }
    });

    test('GET /daily — thiếu secret → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/point/telegram/daily')
        .query({ telegram_id: seedUserTelegramId })
        .expect(401);
    });

    test('GET /daily — chưa claim → can_claim', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/point/telegram/daily')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(res.body.data.can_claim, true);
      assert.equal(res.body.data.claimed_today, false);
      assert.equal(res.body.data.points_reward, 5);
      assert.equal(res.body.data.next_claim_at, null);
      assert.equal(res.body.data.claim_timezone, dailyTz);
    });

    test('POST /daily/claim — lần 1 +point, lần 2 từ chối', async () => {
      const before = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.ok(before != null);

      const claim = await request(app.getHttpServer())
        .post('/api/point/telegram/daily/claim')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(201);

      assert.equal(claim.body.data.points_awarded, 5);
      assert.equal(claim.body.data.claimed_today, true);
      assert.equal(claim.body.data.balance_point, before + 5);

      const after = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.equal(after, before + 5);

      const dup = await request(app.getHttpServer())
        .post('/api/point/telegram/daily/claim')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(400);

      assert.equal(dup.body?.error?.code, 'daily_already_claimed');

      const status = await request(app.getHttpServer())
        .get('/api/point/telegram/daily')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(status.body.data.can_claim, false);
      assert.equal(status.body.data.claimed_today, true);
      assert.ok(status.body.data.next_claim_at);
    });

    test('POST /daily/claim — ngày mới (claim hôm qua) → claim lại được', async () => {
      const before = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.ok(before != null);

      await pool.query(
        `INSERT INTO daily_login_point_claims (user_id, claim_date, points_awarded)
         SELECT id,
                ((NOW() AT TIME ZONE $2)::date - INTERVAL '1 day')::date,
                5
           FROM users WHERE telegram_id = $1`,
        [seedUserTelegramId, dailyTz],
      );

      const status = await request(app.getHttpServer())
        .get('/api/point/telegram/daily')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId })
        .expect(200);

      assert.equal(status.body.data.can_claim, true);

      await request(app.getHttpServer())
        .post('/api/point/telegram/daily/claim')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId })
        .expect(201);

      const after = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.equal(after, before + 5);
    });
  });

  describe('ReferralModule — referral (15)', () => {
    let pool: Pool;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
    });

    beforeEach(async () => {
      if (pool) await clearReferralBindingForTelegram(pool, seedUserTelegramId);
    });

    after(async () => {
      if (pool) {
        await clearReferralBindingForTelegram(pool, seedUserTelegramId);
        await pool.end();
      }
    });

    test('GET /referral/me — thiếu secret → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/referral/telegram/me')
        .query({ telegram_id: seedUserTelegramId })
        .expect(401);
    });

    test('GET /referral/me — có referral_code + config', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/referral/telegram/me')
        .set(botHeaders())
        .query({ telegram_id: seedAdminTelegramId })
        .expect(200);

      assert.ok(res.body.data.referral_code?.length >= 4);
      assert.equal(typeof res.body.data.can_bind, 'boolean');
      assert.equal(res.body.data.referrer_bonus_points, 1);
      assert.equal(res.body.data.referee_bonus_points, 1);
    });

    test('POST /bind — referee + referrer +point, bind lại từ chối', async () => {
      const adminCode = await getReferralCodeForTelegram(pool, seedAdminTelegramId);
      assert.ok(adminCode);

      const userBefore = await getUserBalancePoint(pool, seedUserTelegramId);
      const adminBefore = await getUserBalancePoint(pool, seedAdminTelegramId);
      assert.ok(userBefore != null);
      assert.ok(adminBefore != null);

      const bind = await request(app.getHttpServer())
        .post('/api/referral/telegram/bind')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, code: adminCode })
        .expect(201);

      assert.equal(bind.body.data.referee_bonus_points, 1);
      assert.ok(bind.body.data.referrer_display_name);
      assert.equal(await getUserBalancePoint(pool, seedUserTelegramId), userBefore + 1);
      assert.equal(await getUserBalancePoint(pool, seedAdminTelegramId), adminBefore + 1);

      const dup = await request(app.getHttpServer())
        .post('/api/referral/telegram/bind')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, code: adminCode })
        .expect(400);

      assert.equal(dup.body?.error?.code, 'referral_already_bound');
    });

    test('POST /bind — mã không hợp lệ', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/referral/telegram/bind')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, code: 'ZZZZINVALID' })
        .expect(400);

      assert.equal(res.body?.error?.code, 'referral_invalid');
    });

    test('POST /bind — referral_self', async () => {
      const ownCode = await getReferralCodeForTelegram(pool, seedUserTelegramId);
      assert.ok(ownCode);

      const res = await request(app.getHttpServer())
        .post('/api/referral/telegram/bind')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, code: ownCode })
        .expect(400);

      assert.equal(res.body?.error?.code, 'referral_self');
    });
  });

  describe('CouponModule — user wallet (16)', () => {
    let pool: Pool;
    let variantId: number;

    before(async () => {
      if (!process.env.DATABASE_URL) return;
      pool = createE2ePool();
      const v = await pool.query<{ id: number }>(
        `SELECT id FROM product_variants WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`,
      );
      variantId = v.rows[0].id;
    });

    after(async () => {
      if (pool) await pool.end();
    });

    test('GET /coupon/telegram/mine?status=active — có E2E_VIP10', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/coupon/telegram/mine')
        .set(botHeaders())
        .query({ telegram_id: seedUserTelegramId, status: 'active' })
        .expect(200);

      assert.equal(res.body.data.status, 'active');
      const vip = res.body.data.items.find((i: { code: string }) => i.code === 'E2E_VIP10');
      assert.ok(vip);
      assert.ok(vip.user_coupon_id);
      assert.equal(vip.can_use, true);
    });

    test('POST /coupon/telegram/redeem — E2E_SHOP5 trừ 10 point', async () => {
      const before = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.ok(before != null);
      assert.ok(before >= 10);

      const res = await request(app.getHttpServer())
        .post('/api/coupon/telegram/redeem')
        .set(botHeaders())
        .send({ telegram_id: seedUserTelegramId, code: 'E2E_SHOP5' })
        .expect(201);

      assert.ok(res.body.data.user_coupon_id);
      const after = await getUserBalancePoint(pool, seedUserTelegramId);
      assert.equal(after, before - 10);
    });

    test('POST /order/telegram/quote — E2E_PROMO15 PRIVATE', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          coupon_code: 'E2E_PROMO15',
        })
        .expect(201);

      assert.equal(res.body.data.coupon_applied, 'E2E_PROMO15');
      assert.ok(res.body.data.discount_usdt > 0);
    });

    test('POST /order/telegram/quote — E2E_FIXED5', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          coupon_code: 'E2E_FIXED5',
        })
        .expect(201);

      assert.equal(res.body.data.coupon_applied, 'E2E_FIXED5');
      assert.equal(res.body.data.discount_usdt, 1);
      assert.equal(res.body.data.discount_vnd, 10000);
    });

    test('POST /order/telegram/quote — user_coupon_id E2E_VIP10', async () => {
      const uc = await pool.query<{ id: number }>(
        `SELECT uc.id
           FROM user_coupons uc
           INNER JOIN coupons c ON c.id = uc.coupon_id
           INNER JOIN users u ON u.id = uc.user_id
           WHERE u.telegram_id = $1 AND c.code = 'E2E_VIP10' AND uc.used_at IS NULL
           ORDER BY uc.id ASC LIMIT 1`,
        [seedUserTelegramId],
      );
      const userCouponId = uc.rows[0]?.id;
      assert.ok(userCouponId);

      const res = await request(app.getHttpServer())
        .post('/api/order/telegram/quote')
        .set(botHeaders())
        .send({
          telegram_id: seedUserTelegramId,
          variant_id: variantId,
          quantity: 1,
          user_coupon_id: userCouponId,
        })
        .expect(201);

      assert.equal(res.body.data.coupon_applied, 'E2E_VIP10');
      assert.ok(res.body.data.discount_usdt > 0);
    });
  });
});
