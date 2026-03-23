/**
 * E2E Products (cần Postgres đã seed admin + category).
 */
import * as path from 'node:path';
import * as assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { config } from 'dotenv';
import { getPgPool } from '../../src/common/database/pg-pool';
import { adminLogin, bearerHeaders } from '../helpers/admin-auth';
import { createTestApp } from '../helpers/create-test-app';

config({ path: path.resolve(__dirname, '../../.env') });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = '/api/admin/v1';

describe('Admin API — products (e2e)', { skip: !hasDb }, () => {
  let app: INestApplication;
  let token: string;
  let categoryId: number;
  let createdProductId: number | null = null;

  before(async () => {
    app = await createTestApp();
    token = await adminLogin(app);

    const catRes = await getPgPool().query<{ id: number }>(
      `SELECT id FROM categories WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`,
    );
    categoryId = catRes.rows[0]?.id;
    assert.ok(categoryId, 'Need at least one category from seed (npm run db:seed)');
  });

  after(async () => {
    if (createdProductId != null) {
      await request(app.getHttpServer())
        .delete(`${API}/products/${createdProductId}`)
        .set(bearerHeaders(token))
        .catch(() => undefined);
    }
    await app?.close();
  });

  test('GET /products — 401 without token', async () => {
    await request(app.getHttpServer()).get(`${API}/products`).expect(401);
  });

  test('GET /products — 200 paginated', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/products?page=1&limit=10`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(typeof res.body.pagination.total, 'number');
  });

  test('POST /products — create + GET detail + DELETE', async () => {
    const slug = `e2e-product-${Date.now()}`;
    const createRes = await request(app.getHttpServer())
      .post(`${API}/products`)
      .set(bearerHeaders(token))
      .send({
        name_en: 'E2E Test Product',
        name_vi: 'Sản phẩm test E2E',
        description_en: 'Created by e2e test',
        description_vi: 'Tạo bởi e2e test',
        slug,
        category_id: categoryId,
      });

    assert.equal(createRes.status, 201);

    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.slug, slug);
    createdProductId = createRes.body.data.id;

    const detailRes = await request(app.getHttpServer())
      .get(`${API}/products/${createdProductId}`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(detailRes.body.data.id, createdProductId);
    assert.ok(Array.isArray(detailRes.body.data.plans));
    assert.ok(Array.isArray(detailRes.body.data.variants));

    const planRes = await request(app.getHttpServer())
      .post(`${API}/products/${createdProductId}/plans`)
      .set(bearerHeaders(token))
      .send({ slug: 'basic', name_en: 'Basic', name_vi: 'Cơ bản' })
      .expect(201);

    const planId = planRes.body.data.id;

    const variantRes = await request(app.getHttpServer())
      .post(`${API}/products/${createdProductId}/variants`)
      .set(bearerHeaders(token))
      .send({
        plan_id: planId,
        name_en: '1 Month',
        name_vi: '1 tháng',
        fulfillment_type: 'PREORDER',
        warranty_type: 'NONE',
        payment_methods: ['BINANCE', 'BALANCE'],
        prices: [{ currency: 'USDT', amount: 9.99 }],
      })
      .expect(201);

    const variantId = variantRes.body.data.id;

    const tiersRes = await request(app.getHttpServer())
      .put(`${API}/products/variants/${variantId}/volume-tiers`)
      .set(bearerHeaders(token))
      .send({
        tiers: [
          { min_quantity: 2, discount_bps: 100, is_active: true },
          { min_quantity: 5, discount_bps: 200, is_active: true },
        ],
      })
      .expect(200);

    assert.equal(tiersRes.body.data.length, 2);

    const inStockVariantRes = await request(app.getHttpServer())
      .post(`${API}/products/${createdProductId}/variants`)
      .set(bearerHeaders(token))
      .send({
        name_en: 'Stock tier',
        name_vi: 'Co kho',
        fulfillment_type: 'IN_STOCK',
        warranty_type: 'NONE',
        payment_methods: ['BINANCE', 'BALANCE'],
        prices: [{ currency: 'USDT', amount: 1 }],
      })
      .expect(201);

    const inStockVariantId = inStockVariantRes.body.data.id;

    await request(app.getHttpServer())
      .post(`${API}/stock`)
      .set(bearerHeaders(token))
      .send({
        variant_id: inStockVariantId,
        payloads: 'line-one\nline-two',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`${API}/products/variants/${inStockVariantId}`)
      .set(bearerHeaders(token))
      .send({ fulfillment_type: 'PREORDER' })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`${API}/products/${createdProductId}`)
      .set(bearerHeaders(token))
      .expect(200);

    createdProductId = null;
  });
});
