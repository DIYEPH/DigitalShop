import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { OrderSummary } from "@/types/order";

export type OrdersListProps = {
  lang: Locale;
  dict: Dictionary;
};

export type OrderRow = OrderSummary & {
  updated_at?: string;
  items?: Array<OrderSummary["items"][number]>;
};

export type OrdersListState = {
  orders: OrderRow[];
  loading: boolean;
  error: string;
  empty: boolean;
};
