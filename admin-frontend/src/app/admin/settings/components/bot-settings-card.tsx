"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import type { TelegramBotSettings } from "@/lib/api/shops";
import type { SellerShop } from "@/lib/shop-context";
import type { Translator } from "../settings.types";
import {
  settingsFieldStyle,
  settingsSectionClassName,
  settingsSectionStyle,
} from "./settings-ui";

type Props = {
  t: Translator;
  shop: SellerShop | null;
  bot: TelegramBotSettings | null;
  form: {
    botToken: string;
    setBotToken: (value: string) => void;
    botUsername: string;
    setBotUsername: (value: string) => void;
    savingBot: boolean;
    saveBot: () => Promise<void>;
    togglingBot: boolean;
    toggleBotStatus: () => Promise<void>;
  };
};

export function BotSettingsCard({ t, shop, bot, form }: Props) {
  const configured = Boolean(bot?.configured);
  const active = bot?.status === "ACTIVE";

  return (
    <Card
      variant="flat"
      padding="none"
      className={settingsSectionClassName}
      style={settingsSectionStyle}
    >
      <CardHeader className="border-b border-black/10 px-0 pb-3">
        <CardTitle className="text-base">{t("settings.telegramBot")}</CardTitle>
        <CardDescription>{t("settings.telegramBotHint")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.saveBot();
        }}
        className="grid gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={configured ? "success" : "accent"}>
            {configured ? t("common.configured") : t("common.notConfigured")}
          </Badge>
          {configured ? (
            <Badge variant={active ? "success" : "accent"}>
              {active ? t("settings.botRunning") : t("settings.botStopped")}
            </Badge>
          ) : null}
          {bot?.bot_username ? (
            <span className="text-xs font-black">@{bot.bot_username}</span>
          ) : null}
          {configured ? (
            <Button
              type="button"
              variant={active ? "danger" : "primary"}
              size="sm"
              loading={form.togglingBot}
              onClick={() => void form.toggleBotStatus()}
              className="ml-auto"
            >
              {active ? t("settings.disableBot") : t("settings.enableBot")}
            </Button>
          ) : null}
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase">{t("settings.botUsername")}</span>
          <Input
            value={form.botUsername}
            onChange={(event) => form.setBotUsername(event.target.value)}
            placeholder="@my_shop_bot"
            style={settingsFieldStyle}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black uppercase">{t("settings.botToken")}</span>
          <Input
            value={form.botToken}
            onChange={(event) => form.setBotToken(event.target.value)}
            placeholder="123456:ABC..."
            style={settingsFieldStyle}
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          loading={form.savingBot}
          disabled={!shop || form.botToken.length < 20}
          className="justify-self-start"
        >
          {t("settings.saveBot")}
        </Button>
      </form>
      </CardContent>
    </Card>
  );
}
