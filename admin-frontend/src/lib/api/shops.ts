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

export type PaymentCredential = {
  id: number;
  shop_id: string;
  payment_method: "BINANCE" | "BANK" | "CRYPTO";
  provider: "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";
  display_name: string;
  public_payload: Record<string, unknown>;
  status: "ACTIVE" | "DISABLED";
  has_payload: boolean;
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
    payment_method: "BINANCE" | "BANK" | "CRYPTO";
    provider: "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";
    display_name: string;
    payload: Record<string, unknown>;
    public_payload?: Record<string, unknown>;
  },
) {
  return apiFetch<PaymentCredential>(
    `/api/admin/v1/shops/${shopId}/payment-credentials`,
    { method: "PUT", token, shopId, body: input, cache: "no-store" },
  );
}

