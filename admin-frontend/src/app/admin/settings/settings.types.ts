import type { TranslationKey } from "@/lib/i18n/types";

export type { PaymentCredential, TelegramBotSettings } from "@/lib/api/shops";
export type { SellerShop } from "@/lib/shop-context";

export type Translator = (key: TranslationKey) => string;
