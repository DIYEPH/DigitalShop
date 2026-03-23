/**
 * E2E Users (cần Postgres + seed admin).
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

describe("Admin API — users (e2e)", { skip: !hasDb }, () => {
  let app: INestApplication;
  let token: string;
  let testUserId: number;
  let originalRole: string;
  let originalStatus: string;

  before(async () => {
    app = await createTestApp();
    token = await adminLogin(app);

    const pool = getPgPool();
    const userRes = await pool.query<{
      id: number;
      role: string;
      status: string;
    }>(
      `SELECT id, role::text AS role, status::text AS status
       FROM users
       WHERE role = 'USER' AND status = 'ACTIVE'
       ORDER BY id ASC
       LIMIT 1`,
    );
    testUserId = userRes.rows[0]?.id;
    originalRole = userRes.rows[0]?.role ?? "USER";
    originalStatus = userRes.rows[0]?.status ?? "ACTIVE";
    assert.ok(testUserId, "Need at least one USER from seed");
  });

  after(async () => {
    if (testUserId) {
      await getPgPool().query(
        `UPDATE users SET role = $1::role_enum, status = $2::user_status_enum WHERE id = $3`,
        [originalRole, originalStatus, testUserId],
      );
    }
    await app?.close();
  });

  test("GET /users — 401 without token", async () => {
    await request(app.getHttpServer()).get(`${API}/users`).expect(401);
  });

  test("GET /users — 200 paginated", async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/users?page=1&limit=10`)
      .set(bearerHeaders(token))
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(res.body.data.pagination);
    assert.ok(res.body.data.users.length >= 1);
    const u = res.body.data.users[0];
    assert.ok(typeof u.id === "number");
    assert.ok("email" in u);
    assert.ok(u.role === "USER" || u.role === "ADMIN");
    assert.ok(u.status === "ACTIVE" || u.status === "BANNED");
    assert.ok(typeof u.created_at === "string");
  });

  test("PATCH /users/:id/status — ban/unban USER", async () => {
    const banned = await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/status`)
      .set(bearerHeaders(token))
      .send({ status: "BANNED" })
      .expect(200);

    assert.equal(banned.body.data.status, "BANNED");

    const active = await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/status`)
      .set(bearerHeaders(token))
      .send({ status: "ACTIVE" })
      .expect(200);

    assert.equal(active.body.data.status, "ACTIVE");
  });

  test("PATCH /users/:id/role — BANNED USER bị từ chối", async () => {
    await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/status`)
      .set(bearerHeaders(token))
      .send({ status: "BANNED" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/role`)
      .set(bearerHeaders(token))
      .send({ role: "ADMIN" })
      .expect(400);

    assert.equal(res.body.error.code, "USER_006");

    await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/status`)
      .set(bearerHeaders(token))
      .send({ status: "ACTIVE" })
      .expect(200);
  });

  test("PATCH /users/:id/role — promote USER → ADMIN", async () => {
    const toAdmin = await request(app.getHttpServer())
      .patch(`${API}/users/${testUserId}/role`)
      .set(bearerHeaders(token))
      .send({ role: "ADMIN" })
      .expect(200);

    assert.equal(toAdmin.body.data.role, "ADMIN");
  });

  test("PATCH /users/:id/role — demote ADMIN → USER bị từ chối", async () => {
    const adminRes = await getPgPool().query<{ id: number }>(
      `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1`,
    );
    const adminId = adminRes.rows[0]?.id;
    assert.ok(adminId);

    const res = await request(app.getHttpServer())
      .patch(`${API}/users/${adminId}/role`)
      .set(bearerHeaders(token))
      .send({ role: "USER" })
      .expect(400);

    assert.equal(res.body.error.code, "USER_006");
  });

  test("PATCH /users/:id/status — ADMIN bị từ chối", async () => {
    const adminRes = await getPgPool().query<{ id: number }>(
      `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1`,
    );
    const adminId = adminRes.rows[0]?.id;
    assert.ok(adminId);

    const res = await request(app.getHttpServer())
      .patch(`${API}/users/${adminId}/status`)
      .set(bearerHeaders(token))
      .send({ status: "BANNED" })
      .expect(400);

    assert.equal(res.body.error.code, "USER_003");
  });
});
