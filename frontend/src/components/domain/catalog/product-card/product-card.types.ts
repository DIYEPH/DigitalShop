import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/types/product";

export type ProductCardProps = {
  lang: Locale;
  dict: Dictionary;
  product: Product;
};

