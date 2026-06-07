import { apiFetch } from "./client";
import type { Locale } from "../i18n/config";
import type { OrderSummary } from "../../types/order";

export type MyOrdersResponse = {
  orders: Array<OrderSummary & { updated_at?: string }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export async function getMyOrders(args: { token: string; lang: Locale; page?: number; limit?: number }) {
  const { token, lang, page, limit } = args;
  const qs = new URLSearchParams();
  if (page) qs.set("page", String(page));
  if (limit) qs.set("limit", String(limit));
  const q = qs.toString();

  return apiFetch<MyOrdersResponse>(`/api/orders${q ? `?${q}` : ""}`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}

