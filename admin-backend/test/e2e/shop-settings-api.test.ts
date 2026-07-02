import * as path from "node:path";
import * as assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { config } from "dotenv";
import { getPgPool } from "../../src/common/database/pg-pool";
import { adminLogin, sellerHeaders } from "../helpers/admin-auth";
import { createTestApp } from "../helpers/create-test-app";

config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = "/api/admin/v1";

describe("Shop settings API (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;
  let token: string;
  let shopId: string;
  let credentialId: number | null = null;

  before(async () => {
    app = await createTestApp();
    token = await adminLogin(app);

    const shopRes = await getPgPool().query<{ id: string }>(
      `SELECT id::text FROM shops WHERE slug = 'default' LIMIT 1`,
    );
    shopId = shopRes.rows[0]?.id;
    assert.ok(shopId, "Need default shop from seed");
  });

  after(async () => {
    if (shopId) {
      await getPgPool().query(`DELETE FROM telegram_bots WHERE shop_id = $1::uuid`, [
        shopId,
      ]);
      await getPgPool().query(
        `DELETE FROM shop_payment_credentials WHERE shop_id = $1::uuid`,
        [shopId],
      );
    }
    await app?.close();
  });

  test("GET /shops/:shopId/bot — returns unconfigured metadata", async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/shops/${shopId}/bot`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.equal(res.body.data.configured, false);
  });

  test("PUT /shops/:shopId/bot — stores encrypted token", async () => {
    const tokenValue = "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const res = await request(app.getHttpServer())
      .put(`${API}/shops/${shopId}/bot`)
      .set(sellerHeaders(token, shopId))
      .send({ bot_token: tokenValue, bot_username: "@digitalshop_e2e_bot" })
      .expect(200);

    assert.equal(res.body.data.configured, true);
    assert.equal(res.body.data.bot_username, "digitalshop_e2e_bot");
    assert.equal(typeof res.body.data.internal_secret, "string");
    assert.equal("bot_token" in res.body.data, false);

    const db = await getPgPool().query<{ bot_token_encrypted: string }>(
      `SELECT bot_token_encrypted FROM telegram_bots WHERE shop_id = $1::uuid LIMIT 1`,
      [shopId],
    );
    assert.ok(db.rows[0]?.bot_token_encrypted.startsWith("v1:"));
    assert.equal(db.rows[0].bot_token_encrypted.includes(tokenValue), false);
  });

  test("PUT/GET/DELETE payment credential — stores metadata only", async () => {
    const create = await request(app.getHttpServer())
      .put(`${API}/shops/${shopId}/payment-credentials`)
      .set(sellerHeaders(token, shopId))
      .send({
        payment_method: "BINANCE",
        provider: "BINANCE",
        display_name: "E2E Binance",
        payload: { api_key: "secret-api-key", api_secret: "secret-api-secret" },
        public_payload: { pay_id: "123456789" },
      })
      .expect(200);

    credentialId = create.body.data.id;
    assert.equal(create.body.data.payment_method, "BINANCE");
    assert.equal(create.body.data.public_payload.pay_id, "123456789");
    assert.equal(create.body.data.has_payload, true);
    assert.equal("payload" in create.body.data, false);

    const list = await request(app.getHttpServer())
      .get(`${API}/shops/${shopId}/payment-credentials`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.ok(
      list.body.data.credentials.some(
        (credential: { id: number; status: string }) =>
          credential.id === credentialId && credential.status === "ACTIVE",
      ),
    );

    const db = await getPgPool().query<{ encrypted_payload: string }>(
      `SELECT encrypted_payload
       FROM shop_payment_credentials
       WHERE id = $1 AND shop_id = $2::uuid`,
      [credentialId, shopId],
    );
    assert.ok(db.rows[0]?.encrypted_payload.startsWith("v1:"));
    assert.equal(db.rows[0].encrypted_payload.includes("secret-api-key"), false);

    const disabled = await request(app.getHttpServer())
      .delete(`${API}/shops/${shopId}/payment-credentials/${credentialId}`)
      .set(sellerHeaders(token, shopId))
      .expect(200);

    assert.equal(disabled.body.data.status, "DISABLED");
  });

  test("PUT /payment-credentials — rejects incompatible provider", async () => {
    const res = await request(app.getHttpServer())
      .put(`${API}/shops/${shopId}/payment-credentials`)
      .set(sellerHeaders(token, shopId))
      .send({
        payment_method: "BINANCE",
        provider: "SEPAY",
        display_name: "Invalid",
        payload: { api_key: "secret" },
      })
      .expect(400);

    assert.equal(res.body.error.code, "VALID_001");
  });
});
