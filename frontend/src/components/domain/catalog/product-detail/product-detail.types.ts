import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { Product, ProductPlan, ProductVariant, VolumeTier } from "@/types/product";

export type ProductDetailProps = {
  lang: Locale;
  dict: Dictionary;
  product: Product;
};

export type AltCurrencyInfo = {
  currency: "USDT";
  price: number;
} | null;

export type ActiveVolumeTier = VolumeTier & {
  /** Discounted price for the chosen variant + currency (per unit). */
  unit_price: number;
};

export type ProductDetailViewModel = {
  variants: ProductVariant[];
  plans: ProductPlan[];
  scopedVariants: ProductVariant[];
  selected: ProductVariant | null;
  planId: number | null;
  setPlanId: (id: number | null) => void;
  variantId: number | null;
  setVariantId: (id: number | null) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  maxQuantity?: number;
  price: number;
  discountedPrice: number;
  /** Final unit price including volume tier (if any) for current quantity. */
  effectiveUnitPrice: number;
  promoBps: number | null;
  hasPromoPct: boolean;
  altSelected: AltCurrencyInfo;
  /** Sorted asc by min_quantity. Empty if variant has no tiers. */
  volumeTiers: VolumeTier[];
  /** Tier currently triggered by the chosen quantity (or null). */
  activeVolumeTier: ActiveVolumeTier | null;
  buyNow: () => void;
  pending: {
    orderId: string;
    expiresAt: string;
    sameProduct: boolean;
    loading: boolean;
    cancelLoading: boolean;
    refresh: () => Promise<void>;
    cancel: () => Promise<void>;
  } | null;
};
