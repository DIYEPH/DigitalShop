import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { OrderDetails } from "@/lib/api/order-details";
import type { PaymentInstruction } from "@/types/order";

export type OrderDetailsProps = {
  lang: Locale;
  dict: Dictionary;
  id: string;
};

export type OrderDetailsState = {
  order: OrderDetails | null;
  payment: PaymentInstruction | null;
  loading: boolean;
  error: string;
};
