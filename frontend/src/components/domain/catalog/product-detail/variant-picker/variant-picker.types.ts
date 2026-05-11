import type { Locale } from "@/lib/i18n/config";
import type { Currency } from "@/types/order";
import type { ProductVariant } from "@/types/product";

export type VariantPickerProps = {
  variants: ProductVariant[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  currency: Currency;
  fallbackPrice: number;
  lang: Locale;
  label: string;
};
