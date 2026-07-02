import { INestApplication } from "@nestjs/common";
import request from "supertest";

const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "admin@digitalshop.dev";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || "password";

export function adminCredentials() {
  return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
}

export async function adminLogin(
  app: INestApplication,
  passwordOverride?: string,
): Promise<string> {
  const { email, password } = adminCredentials();
  const res = await request(app.getHttpServer())
    .post("/api/admin/v1/auth/login")
    .send({ email, password: passwordOverride ?? password })
    .expect(200);

  const token = res.body?.data?.access_token;
  if (!token || typeof token !== "string") {
    throw new Error("adminLogin: missing access_token in response");
  }
  return token;
}

export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function sellerHeaders(token: string, shopId: string): Record<string, string> {
  return { ...bearerHeaders(token), "X-Shop-Id": shopId };
}
