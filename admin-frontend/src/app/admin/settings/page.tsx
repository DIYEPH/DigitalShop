"use client";

import { useLanguage } from "@/lib/i18n/use-language";
import { BotSettingsCard } from "./components/bot-settings-card";
import { PasswordCard } from "./components/password-card";
import { PaymentMethodsCard } from "./components/payment-methods-card";
import { SettingsNotices } from "./components/settings-notices";
import { ShopProfileCard } from "./components/shop-profile-card";
import { useShopSettings } from "./settings.hooks";

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const settings = useShopSettings(t);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-brutal-fg">
          {t("settings.title")}
        </h1>
        <p className="text-sm font-bold text-gray-600">
          {t("settings.subtitle")}
        </p>
      </div>

      <SettingsNotices {...settings.notices} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ShopProfileCard
          t={t}
          shop={settings.shop}
          loading={settings.loading}
          form={settings.shopForm}
        />
        <BotSettingsCard
          t={t}
          shop={settings.shop}
          bot={settings.bot}
          form={settings.botForm}
        />
      </div>

      <PaymentMethodsCard t={t} />
      <PasswordCard t={t} form={settings.passwordForm} />
    </div>
  );
}
