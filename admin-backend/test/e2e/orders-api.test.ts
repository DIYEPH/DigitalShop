/**
 * E2E Orders (cần Postgres + seed admin).
 */
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { config } from "dotenv";
import { getPgPool } from "../../src/common/database/pg-pool";
import { adminLogin, bearerHeaders, sellerHeaders } from "../helpers/admin-auth";
import { createTestApp } from "../helpers/create-test-app";

config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = "/api/admin/v1";

describe("Admin API — orders (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;
  let token: string;
  let shopId: string;
  let testOrderId: string | null = null;
  let testUserId: number;
  let testVariantId: number;

  before(async () => {
    app = await createTestApp();
    token = await adminLogin(app);

    const pool = getPgPool();
    const shopRes = await pool.query<{ id: string }>(
      `SELECT id::text FROM shops WHERE slug = 'default' LIMIT 1`,
    );
    shopId = shopRes.rows[0]?.id;
    assert.ok(shopId, "Need default shop from seed");

    const userRes = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE role = 'USER' AND status = 'ACTIVE' ORDER BY id ASC LIMIT 1`,
    );
    testUserId = userRes.rows[0]?.id;
    assert.ok(testUserId, "Need at least one USER from seed");

    const variantRes = await pool.query<{ id: number }>(
      `SELECT v.id
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.is_active = TRUE AND p.shop_id = $1::uuid
       ORDER BY v.id ASC LIMIT 1`,
      [shopId],
    );
    testVariantId = variantRes.rows[0]?.id;
    assert.ok(testVariantId, "Need at least one variant from seed");

    const orderRes = await pool.query<{ id: string }>(
      `INSERT INTO orders (
          shop_id, user_id, payment_code, total_price, currency, payment_method, status
        )
        VALUES ($1::uuid, $2, $3, 10.00, 'USDT', 'BINANCE', 'PENDING')
        RETURNING id::text AS id`,
      [shopId, testUserId, `E2E${Date.now().toString(36).toUpperCase().slice(-6)}`],
    );
    testOrderId = orderRes.rows[0]?.id ?? null;
    assert.ok(testOrderId);

    await pool.query(
      `INSERT INTO order_items (
          order_id, variant_id, quantity, unit_price,
          snapshot_variant_name, snapshot_fulfillment_type,
          snapshot_warranty_type
        )
        VALUES ($1::uuid, $2, 1, 10.00, 'E2E variant', 'PREORDER', 'NONE')`,
      [testOrderId, testVariantId],
    );
  });

  after(async () => {
    if (testOrderId) {
      await getPgPool().query(`DELETE FROM orders WHERE id = $1::uuid`, [
        testOrderId,
      ]);
    }
    await app?.close();
  });

  test("GET /orders — 401 without token", async () => {
    await request(app.getHttpServer()).get(`${API}/orders`).expect(401);
  });

  test("GET /orders — 200 paginated", async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/orders?page=1&limit=10`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.orders);
    assert.ok(Array.isArray(res.body.data.orders));
    assert.equal(typeof res.body.data.pagination.total, "number");
  });

  test("GET /orders/:id — 200 detail with items", async () => {
    assert.ok(testOrderId);

    const res = await request(app.getHttpServer())
      .get(`${API}/orders/${testOrderId}`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testOrderId);
    assert.equal(res.body.data.payment_method, "BINANCE");
    assert.ok("payment_code" in res.body.data);
    assert.ok("tx_id" in res.body.data);
    assert.ok(Array.isArray(res.body.data.items));
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.items[0].variant_id, testVariantId);
    assert.equal(res.body.data.items[0].snapshot_variant_name, "E2E variant");
  });

  test("POST confirm + deliver — PREORDER manual flow", async () => {
    assert.ok(testOrderId);

    const confirmRes = await request(app.getHttpServer())
      .post(`${API}/orders/${testOrderId}/confirm`)
      .set(sellerHeaders(token, shopId))
      .send({})
      .expect(200);

    assert.equal(confirmRes.body.data.status, "PAID");

    const deliverRes = await request(app.getHttpServer())
      .post(`${API}/orders/${testOrderId}/deliver`)
      .set(sellerHeaders(token, shopId))
      .send({ delivery_note: "E2E delivered" })
      .expect(200);

    assert.equal(deliverRes.body.data.status, "DELIVERED");
    assert.ok(deliverRes.body.data.delivered_at);
  });

  test("GET/POST /orders/:id/messages", async () => {
    assert.ok(testOrderId);

    const listRes = await request(app.getHttpServer())
      .get(`${API}/orders/${testOrderId}/messages`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.ok(Array.isArray(listRes.body.data.messages));

    const postRes = await request(app.getHttpServer())
      .post(`${API}/orders/${testOrderId}/messages`)
      .set(sellerHeaders(token, shopId))
      .send({ message: "Hello from e2e", kind: "TEXT" });

    if (postRes.status === 201) {
      assert.equal(postRes.body.data.message, "Hello from e2e");
      return;
    }
    assert.equal(postRes.status, 400);
    assert.match(String(postRes.body.error?.message ?? ""), /order_messages/i);
  });
});
