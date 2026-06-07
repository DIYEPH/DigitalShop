import { apiFetch } from "./client";
import type { Locale } from "../i18n/config";
import type { PaymentInstruction } from "../../types/order";

export type OrderDetails = {
  id: string;
  total_price: number;
  currency: "USDT";
  payment_method: "USDT" | "BINANCE" | "BALANCE";
  status: "PENDING" | "PAID" | "CANCELLED" | "DELIVERED";
  delivery_note: string | null;
  expires_at: string | null;
  seconds_left: number | null;
  items: Array<{
    order_item_id?: number;
    variant_id: number;
    product_id: number;
    product_name?: string;
    snapshot_variant_name: string;
    quantity: number;
    unit_price: number;
    fulfillment_type?: "IN_STOCK" | "PREORDER";
    delivered_payloads?: string[];
    warranty?: { warranty_expires_at: string | null; can_request_warranty: boolean };
  }>;
  created_at: string;
  updated_at: string;
};

export type OrderMessage = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number | null;
  sender_role: "ADMIN" | "USER";
  kind: "TEXT" | "WARRANTY_REQUEST" | "SYSTEM";
  message: string;
  created_at: string;
};

export async function getOrderDetails(args: { token: string; lang: Locale; id: string }) {
  const { token, lang, id } = args;
  return apiFetch<OrderDetails>(`/api/orders/${id}`, { method: "GET", token, lang, cache: "no-store" });
}

export async function getOrderPayment(args: { token: string; lang: Locale; id: string }) {
  const { token, lang, id } = args;
  return apiFetch<{ order: { id: string; total_price: number; currency: "USDT"; payment_method: "USDT" | "BINANCE" | "BALANCE"; status: "PENDING" | "PAID" | "CANCELLED" | "DELIVERED" }; payment: PaymentInstruction }>(
    `/api/orders/${id}/payment`,
    { method: "GET", token, lang, cache: "no-store" },
  );
}

export async function cancelOrderPending(args: { token: string; lang: Locale; id: string }) {
  const { token, lang, id } = args;
  return apiFetch<{ id: string; status: "CANCELLED" }>(`/api/orders/${id}/cancel`, {
    method: "POST",
    token,
    lang,
    cache: "no-store",
  });
}

export async function getOrderMessages(args: { token: string; lang: Locale; id: string }) {
  const { token, lang, id } = args;
  return apiFetch<{ messages: OrderMessage[] }>(`/api/orders/${id}/messages`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}

export async function postOrderMessage(args: {
  token: string;
  lang: Locale;
  id: string;
  message: string;
  order_item_id?: number;
  kind?: "TEXT" | "WARRANTY_REQUEST";
}) {
  const { token, lang, id, message, order_item_id, kind } = args;
  return apiFetch<OrderMessage>(`/api/orders/${id}/messages`, {
    method: "POST",
    token,
    lang,
    cache: "no-store",
    body: { message, kind: kind ?? "TEXT", order_item_id: order_item_id ?? null },
  });
}
