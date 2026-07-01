import { changePassword } from "@/lib/api/auth";
import {
  getTelegramBotSettings,
  listPaymentCredentials,
  listShops,
  updateShop,
  updateTelegramBotSettings,
  upsertPaymentCredential,
} from "@/lib/api/shops";
import type { PaymentMethod, PaymentProvider } from "./settings.types";

export const settingsService = {
  listShops: (token: string) => listShops(token),
  getBot: (token: string, shopId: string) =>
    getTelegramBotSettings(token, shopId),
  listCredentials: (token: string, shopId: string) =>
    listPaymentCredentials(token, shopId),
  updateShop: (
    token: string,
    shopId: string,
    input: { name: string; logo_url?: string; support_url?: string },
  ) => updateShop(token, shopId, input),
  updateBot: (
    token: string,
    shopId: string,
    input: { bot_token: string; bot_username?: string },
  ) => updateTelegramBotSettings(token, shopId, input),
  upsertCredential: (
    token: string,
    shopId: string,
    input: {
      payment_method: PaymentMethod;
      provider: PaymentProvider;
      display_name: string;
      public_payload: Record<string, unknown>;
      payload: Record<string, unknown>;
    },
  ) => upsertPaymentCredential(token, shopId, input),
  changePassword: (token: string, current: string, next: string) =>
    changePassword(token, current, next),
};
