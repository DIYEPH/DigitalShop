import type { Category } from "./category";
import type { Currency } from "./order";
import type { PaymentMethod } from "./order";

export type ProductPlan = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
};

export type VolumeTier = {
  min_quantity: number;
  discount_bps: number;
};

export type ProductVariant = {
  id: number;
  name: string;
  is_active?: boolean;
  plan_id: number | null;
  fulfillment_type?: "IN_STOCK" | "PREORDER";
  preorder_limit?: number | null;
  preorder_delivery_hours?: number | null;
  preorder_remaining?: number | null;
  available_stock_count?: number;
  warranty_type?: string;
  warranty_value?: number | null;
  warranty_unit?: string | null;
  prices: Partial<Record<Currency, number>>;
  promo_ends_at?: string | null;
  promo_percent_bps?: number | null;
  volume_tiers?: VolumeTier[];
};

/** Sản phẩm hiển thị giá USDT. */
export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  prices: Partial<Record<Currency, number>>;
  payment_methods?: PaymentMethod[];
  sold_count?: number;
  badges?: Array<"popular" | "hot" | "new">;
  in_stock?: boolean;
  image_url: string | null;
  category_id: number;
  category?: Category;
  plans?: ProductPlan[];
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}
