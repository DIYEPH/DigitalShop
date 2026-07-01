import type { TranslationKey } from "@/lib/i18n/types";

export type { PaymentCredential, TelegramBotSettings } from "@/lib/api/shops";
export type { SellerShop } from "@/lib/shop-context";

export type PaymentMethod = "BINANCE" | "BANK" | "CRYPTO";
export type PaymentProvider = "BINANCE" | "BANK" | "SEPAY" | "CRYPTO";

export type Translator = (key: TranslationKey) => string;
