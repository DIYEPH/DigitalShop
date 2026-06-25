"use client";

import { useEffect, useState } from "react";
import { readAdminSession } from "./session";

/**
 * Token admin sau mount — tránh gọi getAuthToken() lúc render SSR (hydration / null).
 * Shell đã chặn guest; hook dùng cho page gọi API.
 */
export function useAdminToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const { ok, token: t } = readAdminSession();
      setToken(ok ? t : null);
    });
  }, []);

  return token;
}
