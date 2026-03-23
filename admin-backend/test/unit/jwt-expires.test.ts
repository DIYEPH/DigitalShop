import * as assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { jwtExpiresInSeconds } from "../../src/common/utils/jwt-expires.util";

describe("jwtExpiresInSeconds", () => {
  const original = process.env.JWT_EXPIRES_IN;

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = original;
  });

  test("mặc định 3d → 259200", () => {
    delete process.env.JWT_EXPIRES_IN;
    assert.equal(jwtExpiresInSeconds(), 3 * 24 * 3600);
  });

  test("3d → 259200", () => {
    process.env.JWT_EXPIRES_IN = "3d";
    assert.equal(jwtExpiresInSeconds(), 3 * 24 * 3600);
  });

  test("30m → 1800", () => {
    process.env.JWT_EXPIRES_IN = "30m";
    assert.equal(jwtExpiresInSeconds(), 1800);
  });

  test("3600 (giây) → 3600", () => {
    process.env.JWT_EXPIRES_IN = "3600";
    assert.equal(jwtExpiresInSeconds(), 3600);
  });

  test("chuỗi không hợp lệ → fallback 3d", () => {
    process.env.JWT_EXPIRES_IN = "invalid";
    assert.equal(jwtExpiresInSeconds(), 3 * 24 * 3600);
  });
});
