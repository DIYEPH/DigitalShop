import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { BalanceRow } from "@/types/balance";

export type TopupViewProps = {
  lang: Locale;
  dict: Dictionary;
};

export type TopupViewState = {
  balances: BalanceRow[] | null;
  usdt: number;
};
