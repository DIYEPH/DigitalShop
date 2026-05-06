import type { Product, VolumeTier } from "@/types/product";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export type AddToCartButtonVariant = "buy" | "cart";

export type AddToCartButtonProps = {
  lang: Locale;
  dict: Dictionary;
  product: Product;
  selected_variant_id?: number | null;
  selected_variant_name?: string | null;
  selected_variant_promo_bps?: number | null;
  compare_at_price?: number | null;
  selected_variant_volume_tiers?: VolumeTier[] | null;
  quantity?: number;
  maxQuantity?: number;
  variant?: AddToCartButtonVariant;
  disabled?: boolean;
};

