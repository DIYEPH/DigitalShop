import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { Currency } from "@/types/order";
import type { VolumeTier } from "@/types/product";

export type VolumeTierListProps = {
  /** Already sorted asc by min_quantity. */
  tiers: VolumeTier[];
  /** Quantity selected by the user (used to highlight active tier). */
  quantity: number;
  /** Discounted unit price (after promo, before volume). Used to render previews. */
  unitPrice: number;
  currency: Currency;
  lang: Locale;
  dict: Dictionary;
};
