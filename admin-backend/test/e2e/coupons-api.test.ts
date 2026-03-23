/**
 * E2E Coupons (cần Postgres + seed admin).
 */
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { config } from "dotenv";
import { getPgPool } from "../../src/common/database/pg-pool";
import { adminLogin, bearerHeaders } from "../helpers/admin-auth";
import { createTestApp } from "../helpers/create-test-app";

config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = "/api/admin/v1";
const CODE_PREFIX = `E2E_ADMIN_${Date.now().toString(36).toUpperCase()}`;

describe("Admin API — coupons (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;
  let token: string;
  let variantId: number;
  let userId: number;
  const createdCodes: string[] = [];

  before(async () => {
    app = await createTestApp();
    token = await adminLogin(app);

    const pool = getPgPool();
    const variantRes = await pool.query<{ id: number }>(
      `SELECT id FROM product_variants WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`,
    );
    variantId = variantRes.rows[0]?.id;
    assert.ok(
      variantId,
      "Need at least one active product_variants row from seed",
    );

    const userRes = await pool.query<{ id: number }>(
      `SELECT id FROM users WHERE role = 'USER' ORDER BY id ASC LIMIT 1`,
    );
    userId = userRes.rows[0]?.id;
    assert.ok(userId, "Need at least one USER from seed");
  });

  after(async () => {
    if (createdCodes.length > 0) {
      const pool = getPgPool();
      await pool.query(
        `DELETE FROM user_coupons
         WHERE coupon_id IN (SELECT id FROM coupons WHERE code = ANY($1::text[]))`,
        [createdCodes],
      );
      await pool.query(`DELETE FROM coupons WHERE code = ANY($1::text[])`, [
        createdCodes,
      ]);
    }
    await app?.close();
  });

  test("GET /coupons — 401 without token", async () => {
    await request(app.getHttpServer()).get(`${API}/coupons`).expect(401);
  });

  test("POST /coupons — create PERCENT coupon", async () => {
    const code = `${CODE_PREFIX}_P10`;
    createdCodes.push(code);
    const res = await request(app.getHttpServer())
      .post(`${API}/coupons`)
      .set(bearerHeaders(token))
      .send({
        code,
        variant_id: variantId,
        discount_type: "PERCENT",
        percent_bps: 1000,
        visibility: "PRIVATE",
        requires_ownership: false,
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.code, code);
    assert.equal(res.body.data.variant_id, variantId);
    assert.equal(res.body.data.discount_type, "PERCENT");
    assert.equal(res.body.data.percent_bps, 1000);
  });

  test("GET /coupons — 200 list includes created coupon", async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/coupons?search=${CODE_PREFIX}`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.coupons));
    assert.ok(
      res.body.data.coupons.some(
        (c: { code: string }) => c.code === `${CODE_PREFIX}_P10`,
      ),
    );
  });

  test("PATCH /coupons/:id — toggle active", async () => {
    const pool = getPgPool();
    const couponRes = await pool.query<{ id: number }>(
      `SELECT id FROM coupons WHERE code = $1 LIMIT 1`,
      [`${CODE_PREFIX}_P10`],
    );
    const couponId = couponRes.rows[0]?.id;
    assert.ok(couponId);

    const res = await request(app.getHttpServer())
      .patch(`${API}/coupons/${couponId}`)
      .set(bearerHeaders(token))
      .send({ is_active: false })
      .expect(200);

    assert.equal(res.body.data.is_active, false);
  });

  test("POST /coupons/grant — grant ownership coupon", async () => {
    const code = `${CODE_PREFIX}_V1`;
    createdCodes.push(code);
    await request(app.getHttpServer())
      .post(`${API}/coupons`)
      .set(bearerHeaders(token))
      .send({
        code,
        variant_id: variantId,
        discount_type: "FIXED",
        amount_usdt: 1,
        amount_vnd: 1000,
        visibility: "PRIVATE",
        requires_ownership: true,
        per_user_limit: 2,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`${API}/coupons/grant`)
      .set(bearerHeaders(token))
      .send({ user_ids: String(userId), code, quantity: 1 })
      .expect(201);

    assert.equal(res.body.data.code, code);
    assert.equal(res.body.data.results[0].user_id, userId);
    assert.equal(res.body.data.results[0].ok, true);
    assert.equal(res.body.data.results[0].granted, 1);
  });
});
