import type { Currency } from "../../types/order";
import type { Locale } from "../i18n/config";

/** Format giá USDT theo locale (vi/en). */
export function formatPrice(amount: number, _currency: Currency, lang: Locale): string {
  const intlLocale = lang === "vi" ? "vi-VN" : "en-US";
  const n = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${n} USDT`;
}
