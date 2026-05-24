import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { OrderDetails } from "@/lib/api/order-details";
import type { PaymentInstruction } from "@/types/order";

export type BinancePayPanelProps = {
  lang: Locale;
  dict: Dictionary;
  order: OrderDetails;
  payment: Extract<PaymentInstruction, { method: "BINANCE" }>;
  countdown: { mm: string; ss: string } | null;
};
