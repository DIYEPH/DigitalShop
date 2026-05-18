import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { UseCheckoutReturn } from "@/lib/cart/use-checkout";

export type PaymentSectionProps = {
  lang: Locale;
  dict: Dictionary;
  c: UseCheckoutReturn;
};
