import { notifySessionExpired } from "@/lib/auth/session";
import { getActiveShopId } from "@/lib/shop-context";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
  shopId?: string | null;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
}

function resolveApiOrigin(): string {
  if (typeof window === "undefined") {
    return process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3000";
  }
  return process.env.NEXT_PUBLIC_API_ORIGIN || "";
}

type Pagination = { page: number; limit: number; total: number; totalPages: number };

function parseApiError(json: unknown): { message: string; code?: string } {
  if (!json || typeof json !== "object") return { message: "Request failed." };
  const o = json as Record<string, unknown>;
  const err = o.error;
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown };
    const message = typeof e.message === "string" ? e.message : "Request failed.";
    const code = typeof e.code === "string" ? e.code : undefined;
    return { message, code };
  }
  return { message: "Request failed." };
}

async function rawFetch<T>(path: string, opts: FetchOptions): Promise<{ data: T; pagination?: Pagination }> {
  const { body, token, shopId, headers: extra, next, cache, ...rest } = opts;
  const origin = resolveApiOrigin();
  const url = origin ? `${origin}${path}` : path;

  const headers = new Headers(extra);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const resolvedShopId = shopId === undefined ? getActiveShopId() : shopId;
  if (resolvedShopId && shouldAttachShopHeader(path)) {
    headers.set("X-Shop-Id", resolvedShopId);
  }

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Invalid JSON response.", res.status);
  }

  if (!res.ok) {
    const { message, code } = parseApiError(json);
    if (res.status === 401 && typeof window !== "undefined" && opts.token) {
      notifySessionExpired();
    }
    throw new ApiError(message, res.status, code);
  }

  const bodyJson = json as { data?: T; pagination?: Pagination };
  if (!bodyJson || typeof bodyJson !== "object" || bodyJson.data === undefined) {
    throw new ApiError("Invalid API response.", res.status);
  }

  return { data: bodyJson.data, pagination: bodyJson.pagination };
}

function shouldAttachShopHeader(path: string): boolean {
  if (!path.startsWith("/api/admin/v1/")) return false;
  if (path.startsWith("/api/admin/v1/auth/")) return false;
  if (path === "/api/admin/v1/shops") return false;
  return !path.startsWith("/api/admin/v1/users");
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const json = await rawFetch<T>(path, opts);
  return json.data;
}

export async function apiFetchPaginated<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<{ data: T; pagination?: Pagination }> {
  return rawFetch<T>(path, opts);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
