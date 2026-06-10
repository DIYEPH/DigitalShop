import type { Currency, PaymentMethod } from "../../types/order";
import type { Locale } from "../i18n/config";

/** Payment-method ↔ currency mapping (mirrors backend/src/utils/regionPolicy.js). */
export const PAYMENT_CURRENCY: Record<PaymentMethod, Currency> = {
  USDT: "USDT",
  BALANCE: "USDT",
  BINANCE: "USDT",
};

const PAYMENTS_BY_LANG: Record<Locale, PaymentMethod[]> = {
  vi: ["BALANCE", "USDT", "BINANCE"],
  en: ["BALANCE", "USDT", "BINANCE"],
};

export const paymentsForLang = (lang: Locale) => PAYMENTS_BY_LANG[lang];
export const currencyForLang = (_lang: Locale): Currency => "USDT";
export const currencyForPayment = (method: PaymentMethod): Currency => PAYMENT_CURRENCY[method];
