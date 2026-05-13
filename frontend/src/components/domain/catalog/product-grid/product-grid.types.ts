import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { Product } from "@/types/product";

export type ProductGridProps = {
  lang: Locale;
  dict: Dictionary;
  products: Product[];
  error?: string | null;
};

