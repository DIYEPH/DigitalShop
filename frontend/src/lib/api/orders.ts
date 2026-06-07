import { apiFetch } from "./client";
import type { CreateOrderInput, CreateOrderResponse, OrderQuote, PendingOrder } from "../../types/order";
import type { Locale } from "../i18n/config";

export interface CreateOrderArgs extends CreateOrderInput {
  token: string;
  lang?: Locale;
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createOrder(args: CreateOrderArgs): Promise<CreateOrderResponse> {
  const { token, lang, ...body } = args;
  return apiFetch<CreateOrderResponse>(`/api/orders`, {
    method: "POST",
    body,
    token,
    lang,
    cache: "no-store",
    headers: {
      "Idempotency-Key": makeIdempotencyKey(),
    },
  });
}

export async function quoteOrder(args: CreateOrderArgs): Promise<OrderQuote> {
  const { token, lang, ...body } = args;
  return apiFetch<OrderQuote>(`/api/orders/quote`, {
    method: "POST",
    body,
    token,
    lang,
    cache: "no-store",
  });
}

export async function getActivePendingOrder(args: { token: string; lang?: Locale }): Promise<PendingOrder | null> {
  const { token, lang } = args;
  return apiFetch<PendingOrder | null>(`/api/orders/pending-active`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}

export async function cancelPendingOrder(args: { token: string; lang?: Locale; id: string }): Promise<{ id: string; status: string }> {
  const { token, lang, id } = args;
  return apiFetch<{ id: string; status: string }>(`/api/orders/${id}/cancel`, {
    method: "POST",
    token,
    lang,
    cache: "no-store",
  });
}
