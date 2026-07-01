import * as path from "node:path";
import * as assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { config } from "dotenv";
import { getPgPool } from "../../src/common/database/pg-pool";
import { bearerHeaders, sellerHeaders } from "../helpers/admin-auth";
import { createTestApp } from "../helpers/create-test-app";

config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = "/api/admin/v1";

async function login(app: INestApplication, email: string, password = "password") {
  const res = await request(app.getHttpServer())
    .post(`${API}/auth/login`)
    .send({ email, password })
    .expect(200);
  return res.body.data.access_token as string;
}

describe("Seller admin tenant flow (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;
  let defaultShopId: string;
  let createdShopId: string | null = null;

  before(async () => {
    app = await createTestApp();
    const shopRes = await getPgPool().query<{ id: string }>(
      `SELECT id::text FROM shops WHERE slug = 'default' LIMIT 1`,
    );
    defaultShopId = shopRes.rows[0]?.id;
    assert.ok(defaultShopId, "Need default shop from seed");
  });

  after(async () => {
    if (createdShopId) {
      await getPgPool().query(`DELETE FROM shops WHERE id = $1::uuid`, [createdShopId]);
    }
    await app?.close();
  });

  test("buyer-only user cannot login to seller admin", async () => {
    await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: "user@digitalshop.dev", password: "password" })
      .expect(401);
  });

  test("seller candidate can login and create a shop once", async () => {
    const token = await login(app, "seller@digitalshop.dev");
    const me = await request(app.getHttpServer())
      .get(`${API}/auth/me`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(me.body.data.can_create_shop, true);
    assert.deepEqual(me.body.data.shops, []);

    const slug = `seller-e2e-${Date.now().toString(36)}`;
    const create = await request(app.getHttpServer())
      .post(`${API}/shops`)
      .set(bearerHeaders(token))
      .send({ name: "Seller E2E Shop", slug })
      .expect(201);

    createdShopId = create.body.data.id;
    assert.equal(create.body.data.slug, slug);
    assert.equal(create.body.data.member_role, "OWNER");

    const updatedUser = await getPgPool().query<{ can_create_shop: boolean }>(
      `SELECT can_create_shop FROM users WHERE email = 'seller@digitalshop.dev'`,
    );
    assert.equal(updatedUser.rows[0]?.can_create_shop, false);
  });

  test("shop-scoped API requires X-Shop-Id", async () => {
    const token = await login(app, "admin@digitalshop.dev");
    const res = await request(app.getHttpServer())
      .get(`${API}/products`)
      .set(bearerHeaders(token))
      .expect(403);

    assert.equal(res.body.error.code, "TENANT_001");
  });

  test("shop member can access own shop with X-Shop-Id", async () => {
    const token = await login(app, "admin@digitalshop.dev");
    const res = await request(app.getHttpServer())
      .get(`${API}/products?page=1&limit=5`)
      .set(sellerHeaders(token, defaultShopId))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });
});
