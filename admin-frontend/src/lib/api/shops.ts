import { apiFetch } from "./client";
import type { SellerShop } from "@/lib/shop-context";

type ShopCategory = {
  id: number;
  name_en: string;
  name_vi: string;
  slug: string;
  is_selected: boolean;
};

export type TelegramBotSettings = {
  configured: boolean;
  id?: number;
  shop_id?: string;
  bot_username?: string | null;
  status?: string;
  has_token?: boolean;
  internal_secret?: string;
  created_at?: string;
  updated_at?: string;
};

export type ShopPaymentMethod = "BINANCE" | "BANK" | "CRYPTO";
export type ShopPaymentProvider = "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";

export type PaymentCredential = {
  id: number;
  shop_id: string;
  payment_method: ShopPaymentMethod;
  provider: ShopPaymentProvider;
  display_name: string;
  public_payload: Record<string, unknown>;
  status: "ACTIVE" | "DISABLED";
  priority: number;
  has_secret: boolean;
  created_at: string;
  updated_at: string;
};

export async function listShops(token: string) {
  return apiFetch<{ shops: SellerShop[] }>("/api/admin/v1/shops", {
    method: "GET",
    token,
    shopId: null,
    cache: "no-store",
  });
}

export async function createShop(
  token: string,
  input: { name: string; slug: string; logo_url?: string; support_url?: string },
) {
  return apiFetch<SellerShop>("/api/admin/v1/shops", {
    method: "POST",
    token,
    shopId: null,
    body: input,
    cache: "no-store",
  });
}

export async function updateShop(
  token: string,
  shopId: string,
  input: { name?: string; logo_url?: string; support_url?: string },
) {
  return apiFetch<SellerShop>(`/api/admin/v1/shops/${shopId}`, {
    method: "PATCH",
    token,
    shopId,
    body: input,
    cache: "no-store",
  });
}

export async function listShopCategories(token: string, shopId: string) {
  return apiFetch<{ categories: ShopCategory[] }>(
    `/api/admin/v1/shops/${shopId}/categories`,
    { method: "GET", token, shopId, cache: "no-store" },
  );
}

export async function getTelegramBotSettings(token: string, shopId: string) {
  return apiFetch<TelegramBotSettings>(`/api/admin/v1/shops/${shopId}/bot`, {
    method: "GET",
    token,
    shopId,
    cache: "no-store",
  });
}

export async function updateTelegramBotSettings(
  token: string,
  shopId: string,
  input: { bot_token: string; bot_username?: string; status?: "ACTIVE" | "SUSPENDED" },
) {
  return apiFetch<TelegramBotSettings>(`/api/admin/v1/shops/${shopId}/bot`, {
    method: "PUT",
    token,
    shopId,
    body: input,
    cache: "no-store",
  });
}

export async function updateTelegramBotStatus(
  token: string,
  shopId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  return apiFetch<TelegramBotSettings>(`/api/admin/v1/shops/${shopId}/bot/status`, {
    method: "PUT",
    token,
    shopId,
    body: { status },
    cache: "no-store",
  });
}

export async function listPaymentCredentials(token: string, shopId: string) {
  return apiFetch<{ credentials: PaymentCredential[] }>(
    `/api/admin/v1/shops/${shopId}/payment-credentials`,
    { method: "GET", token, shopId, cache: "no-store" },
  );
}

export async function upsertPaymentCredential(
  token: string,
  shopId: string,
  input: {
    payment_method: ShopPaymentMethod;
    provider: ShopPaymentProvider;
    display_name?: string;
    payload?: Record<string, unknown>;
    public_payload?: Record<string, unknown>;
    enabled?: boolean;
    priority?: number;
  },
) {
  return apiFetch<PaymentCredential>(
    `/api/admin/v1/shops/${shopId}/payment-credentials`,
    { method: "PUT", token, shopId, body: input, cache: "no-store" },
  );
}

export async function reorderPaymentCredentials(
  token: string,
  shopId: string,
  order: ShopPaymentMethod[],
) {
  return apiFetch<{ credentials: PaymentCredential[] }>(
    `/api/admin/v1/shops/${shopId}/payment-credentials/order`,
    { method: "PUT", token, shopId, body: { order }, cache: "no-store" },
  );
}

export type ShopCustomer = {
  user_id: number;
  email: string | null;
  username: string | null;
  full_name: string | null;
  telegram_id: string | null;
  status: "ACTIVE" | "BANNED";
  order_count: number;
  total_spent: number;
  first_seen_at: string;
};

export async function listShopCustomers(
  token: string,
  shopId: string,
  args: { page?: number; limit?: number; search?: string } = {},
) {
  const qs = new URLSearchParams();
  if (args.page) qs.set("page", String(args.page));
  if (args.limit) qs.set("limit", String(args.limit));
  if (args.search) qs.set("search", args.search);
  return apiFetch<{
    customers: ShopCustomer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/admin/v1/shops/${shopId}/customers?${qs.toString()}`, {
    method: "GET",
    token,
    shopId,
    cache: "no-store",
  });
}

export async function setShopCustomerStatus(
  token: string,
  shopId: string,
  userId: number,
  status: "ACTIVE" | "BANNED",
) {
  return apiFetch<{ user_id: number; status: string }>(
    `/api/admin/v1/shops/${shopId}/customers/${userId}/status`,
    { method: "PUT", token, shopId, body: { status }, cache: "no-store" },
  );
}

