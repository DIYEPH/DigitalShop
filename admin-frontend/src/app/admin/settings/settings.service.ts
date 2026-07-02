import { changePassword } from "@/lib/api/auth";
import {
  getTelegramBotSettings,
  listShops,
  updateShop,
  updateTelegramBotSettings,
  updateTelegramBotStatus,
} from "@/lib/api/shops";

export const settingsService = {
  listShops: (token: string) => listShops(token),
  getBot: (token: string, shopId: string) =>
    getTelegramBotSettings(token, shopId),
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
  setBotStatus: (token: string, shopId: string, status: "ACTIVE" | "SUSPENDED") =>
    updateTelegramBotStatus(token, shopId, status),
  changePassword: (token: string, current: string, next: string) =>
    changePassword(token, current, next),
};
