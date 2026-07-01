"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
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
  loading: boolean;
  form: {
    shopName: string;
    setShopName: (value: string) => void;
    logoUrl: string;
    setLogoUrl: (value: string) => void;
    supportUrl: string;
    setSupportUrl: (value: string) => void;
    savingShop: boolean;
    saveShop: () => Promise<void>;
  };
};

export function ShopProfileCard({ t, shop, loading, form }: Props) {
  return (
    <Card
      variant="flat"
      padding="none"
      className={settingsSectionClassName}
      style={settingsSectionStyle}
    >
      <CardHeader className="border-b border-black/10 px-0 pb-3">
        <CardTitle className="text-base">{t("settings.shopProfile")}</CardTitle>
        <CardDescription>
          {shop ? `${shop.slug} / ${shop.member_role}` : t("settings.shopProfileHint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4">
      {loading ? (
        <p className="text-sm font-bold text-gray-600">{t("common.loading")}</p>
      ) : shop ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.saveShop();
          }}
          className="grid gap-3"
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase">{t("shell.shopName")}</span>
            <Input
              value={form.shopName}
              onChange={(event) => form.setShopName(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase">{t("settings.logoUrl")}</span>
            <Input
              value={form.logoUrl}
              onChange={(event) => form.setLogoUrl(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase">{t("settings.supportUrl")}</span>
            <Input
              value={form.supportUrl}
              onChange={(event) => form.setSupportUrl(event.target.value)}
              style={settingsFieldStyle}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            loading={form.savingShop}
            className="justify-self-start"
          >
            {t("common.save")}
          </Button>
        </form>
      ) : (
        <p className="text-sm font-bold text-gray-600">{t("settings.chooseShop")}</p>
      )}
      </CardContent>
    </Card>
  );
}
