import { decodeJwt, isJwtExpired, type JwtPayload } from "./jwt";
import { clearAuthToken, getAuthToken } from "./token";

export const ADMIN_SESSION_EXPIRED_EVENT = "admin:session-expired";

type AdminSession = {
  ok: boolean;
  token: string | null;
  payload: JwtPayload | null;
};

/** Đọc token local + kiểm tra JWT (role ADMIN, chưa hết hạn). Chỉ gọi phía client. */
export function readAdminSession(): AdminSession {
  const token = getAuthToken();
  const payload = token ? decodeJwt(token) : null;
  const ok = Boolean(
    token && payload && !isJwtExpired(payload) && payload.role === "ADMIN",
  );
  return { ok, token, payload };
}

export function clearAdminSession(): void {
  clearAuthToken();
}

export function notifySessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
}
