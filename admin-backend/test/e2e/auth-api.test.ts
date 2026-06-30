/**
 * E2E Auth + health (cần Postgres đã seed admin).
 * Chạy: cd backend-bot && npm run db:seed
 *       cd admin-backend && npm run test:e2e
 */
import * as path from "node:path";
import * as assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { config } from "dotenv";
import {
  adminCredentials,
  adminLogin,
  bearerHeaders,
} from "../helpers/admin-auth";
import { createTestApp } from "../helpers/create-test-app";

config({ path: path.resolve(__dirname, "../../.env") });

const hasDb = Boolean(process.env.DATABASE_URL);
const API = "/api/admin/v1";

describe("Admin API — health", () => {
  let app: INestApplication;

  before(async () => {
    app = await createTestApp();
  });

  after(async () => {
    await app?.close();
  });

  test("GET /ping — 200, có status và database", async () => {
    const res = await request(app.getHttpServer()).get("/ping").expect(200);
    const body = res.body.data ?? res.body;
    assert.ok(body.status === "ok" || body.status === "degraded");
    assert.ok(["connected", "disconnected"].includes(body.database));
    assert.equal(typeof body.timestamp, "string");
  });
});

describe("Admin API — auth (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;

  before(async () => {
    app = await createTestApp();
  });

  after(async () => {
    await app?.close();
  });

  test("POST /auth/login — sai mật khẩu → 401 AUTH_001", async () => {
    const { email } = adminCredentials();
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email, password: "wrong-password-xyz" })
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "AUTH_001");
  });

  test("POST /auth/login — thiếu email → 400", async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ password: "password" })
      .expect(400);

    assert.equal(res.body.success, false);
  });

  test("POST /auth/login — đúng seed admin → 200 + access_token", async () => {
    const { email, password } = adminCredentials();
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email, password })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.access_token, "string");
    assert.equal(res.body.data.admin.email, email);
    assert.equal(res.body.data.admin.role, "ADMIN");
    assert.ok(res.body.data.expires_in >= 60);
  });

  test("GET /auth/me — không token → 401", async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/auth/me`)
      .expect(401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "AUTH_003");
  });

  test("GET /auth/me — Bearer hợp lệ → 200 profile", async () => {
    const token = await adminLogin(app);
    const res = await request(app.getHttpServer())
      .get(`${API}/auth/me`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, adminCredentials().email);
    assert.equal(res.body.data.role, "ADMIN");
    assert.ok(res.body.data.created_at);
  });

  test("POST /auth/logout — có token → 200", async () => {
    const token = await adminLogin(app);
    const res = await request(app.getHttpServer())
      .post(`${API}/auth/logout`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.data.message, "Logged out successfully");
  });

  test("PUT /auth/change-password — sai mật khẩu hiện tại → 401 AUTH_001", async () => {
    const token = await adminLogin(app);
    const res = await request(app.getHttpServer())
      .put(`${API}/auth/change-password`)
      .set(bearerHeaders(token))
      .send({ currentPassword: "wrong", newPassword: "NewPass99!" })
      .expect(401);

    assert.equal(res.body.error.code, "AUTH_001");
  });

  test("PUT /auth/change-password — đổi tạm rồi khôi phục seed password", async () => {
    const { password: seedPassword } = adminCredentials();
    const tempPassword = "TempPass99!";
    const token = await adminLogin(app);

    await request(app.getHttpServer())
      .put(`${API}/auth/change-password`)
      .set(bearerHeaders(token))
      .send({ currentPassword: seedPassword, newPassword: tempPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: adminCredentials().email, password: tempPassword })
      .expect(200);

    const token2 = await adminLogin(app, tempPassword);
    await request(app.getHttpServer())
      .put(`${API}/auth/change-password`)
      .set(bearerHeaders(token2))
      .send({ currentPassword: tempPassword, newPassword: seedPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: adminCredentials().email, password: seedPassword })
      .expect(200);
  });
});
