import type { PaymentMethod, PaymentProvider } from "./settings.types";

export const DEFAULT_JSON = "{}";

export const PAYMENT_METHODS: PaymentMethod[] = ["BINANCE", "BANK", "CRYPTO"];

export const PROVIDERS_BY_METHOD: Record<PaymentMethod, PaymentProvider[]> = {
  BINANCE: ["BINANCE"],
  BANK: ["SEPAY", "BANK"],
  CRYPTO: ["CRYPTO"],
};

export function defaultProviderFor(method: PaymentMethod): PaymentProvider {
  return PROVIDERS_BY_METHOD[method][0];
}
