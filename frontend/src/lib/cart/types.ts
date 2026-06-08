import type { Currency } from "../../types/order";
import type { PaymentMethod } from "../../types/order";
import type { VolumeTier } from "../../types/product";

export interface CartItem {
  lineId: string;
  productId: number;
  name: string;
  variantId: number;
  variantName?: string | null;
  promoPercentBps?: number | null;
  /** Base unit price (before any volume tier discount). */
  price: number;
  compare_at_price?: number | null;
  currency: Currency;
  prices: Partial<Record<Currency, number>>;
  payment_methods?: PaymentMethod[];
  max_quantity?: number | null;
  /** Per-variant volume discount tiers. Server is the source of truth, this is for UI only. */
  volume_tiers?: VolumeTier[] | null;
  image_url: string | null;
  quantity: number;
}

export interface CartState { items: CartItem[] }
