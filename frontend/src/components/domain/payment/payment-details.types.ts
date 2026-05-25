import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { PaymentInstruction } from "@/types/order";

export type PaymentDetailsProps = {
  lang: Locale;
  dict: Dictionary;
  payment: PaymentInstruction;
};
