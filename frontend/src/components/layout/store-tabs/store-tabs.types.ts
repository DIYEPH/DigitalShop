import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export type ActiveTab = "home" | "store" | "deals" | "cart" | "orders";

export interface StoreTabsProps {
  lang: Locale;
  dict: Dictionary;
  active?: ActiveTab;
  onOpenEvents?: () => void;
}
