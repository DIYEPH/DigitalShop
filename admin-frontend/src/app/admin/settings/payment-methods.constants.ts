import type { ShopPaymentMethod, ShopPaymentProvider } from "@/lib/api/shops";
import type { TranslationKey } from "@/lib/i18n/types";

export const CRYPTO_NETWORKS = ["TRC20", "BSC"] as const;
export type CryptoNetwork = (typeof CRYPTO_NETWORKS)[number];

export const METHOD_PROVIDER: Record<ShopPaymentMethod, ShopPaymentProvider> = {
  CRYPTO: "CRYPTO",
  BINANCE: "BINANCE",
  BANK: "SEPAY",
};

export const DEFAULT_METHOD_ORDER: ShopPaymentMethod[] = [
  "CRYPTO",
  "BINANCE",
  "BANK",
];

export const METHOD_LABEL_KEY: Record<ShopPaymentMethod, TranslationKey> = {
  CRYPTO: "settings.pay.crypto",
  BINANCE: "settings.pay.binance",
  BANK: "settings.pay.bank",
};

export const METHOD_HINT_KEY: Record<ShopPaymentMethod, TranslationKey> = {
  CRYPTO: "settings.pay.cryptoHint",
  BINANCE: "settings.pay.binanceHint",
  BANK: "settings.pay.bankHint",
};
