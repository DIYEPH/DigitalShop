import type { ApiSuccessBody, Pagination } from "../../types/api";
import type { Locale } from "../i18n/config";
import { localeToCountry } from "../i18n/config";

export interface FetchOptions extends Omit<RequestInit, "body"> {
  lang?: Locale;
  country?: string;
  body?: unknown;
  token?: string;
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

function resolveApiOrigin(): string {
  if (typeof window === "undefined") {
    return process.env.API_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:3002";
  }
  return process.env.NEXT_PUBLIC_API_ORIGIN || "";
}

function messageFromErrorJson(json: unknown): string {
  if (!json || typeof json !== "object") return "Request failed.";
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (Array.isArray(o.message) && typeof o.message[0] === "string") return o.message[0];
  const err = o.error;
  if (err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (typeof err === "string") return err;
  return "Request failed.";
}

async function rawFetch<T>(path: string, opts: FetchOptions): Promise<ApiSuccessBody<T>> {
  const { lang, country, body, token, headers: extra, next, cache, ...rest } = opts;
  const origin = resolveApiOrigin();
  const url = origin ? `${origin}${path}` : path;

  const headers = new Headers(extra);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const c = country ?? (lang ? localeToCountry(lang) : undefined);
  if (c) headers.set("X-Country", c);

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    next: next ?? (cache === "no-store" ? undefined : { revalidate: 60 }),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Invalid JSON response.", res.status);
  }

  if (!res.ok) {
    throw new ApiError(messageFromErrorJson(json), res.status);
  }

  const bodyJson = json as Partial<ApiSuccessBody<T>>;
  if (!bodyJson || typeof bodyJson !== "object" || !("data" in bodyJson)) {
    throw new ApiError("Invalid API response.", res.status);
  }

  return {
    data: bodyJson.data as T,
    pagination: bodyJson.pagination,
    meta: bodyJson.meta,
  };
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const json = await rawFetch<T>(path, opts);
  return json.data;
}

export async function apiFetchPaginated<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<{ data: T; pagination?: Pagination }> {
  const json = await rawFetch<T>(path, opts);
  return { data: json.data, pagination: json.pagination };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
