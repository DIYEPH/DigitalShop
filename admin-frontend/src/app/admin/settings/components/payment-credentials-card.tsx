"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import type { PaymentCredential } from "@/lib/api/shops";
import type { SellerShop } from "@/lib/shop-context";
import { PAYMENT_METHODS, PROVIDERS_BY_METHOD } from "../settings.constants";
import type { PaymentMethod, PaymentProvider, Translator } from "../settings.types";
import {
  settingsFieldStyle,
  settingsSectionClassName,
  settingsSectionStyle,
} from "./settings-ui";

type Props = {
  t: Translator;
  shop: SellerShop | null;
  credentials: PaymentCredential[];
  form: {
    paymentMethod: PaymentMethod;
    setPaymentMethod: (value: PaymentMethod) => void;
    provider: PaymentProvider;
    setProvider: (value: PaymentProvider) => void;
    credentialName: string;
    setCredentialName: (value: string) => void;
    publicPayload: string;
    setPublicPayload: (value: string) => void;
    secretPayload: string;
    setSecretPayload: (value: string) => void;
    savingCredential: boolean;
    saveCredential: () => Promise<void>;
  };
};

export function PaymentCredentialsCard({ t, shop, credentials, form }: Props) {
  return (
    <Card
      variant="flat"
      padding="none"
      className={settingsSectionClassName}
      style={settingsSectionStyle}
    >
      <CardHeader className="border-b border-black/10 px-0 pb-3">
        <CardTitle className="text-base">{t("settings.paymentCredentials")}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <div
          className={
            credentials.length > 0
              ? "grid gap-4 lg:grid-cols-[1fr_1.2fr]"
              : "grid max-w-xl gap-4"
          }
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.saveCredential();
            }}
            className="grid gap-3"
          >
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase">{t("settings.method")}</span>
              <Select
                value={form.paymentMethod}
                onValueChange={(value) => form.setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger style={settingsFieldStyle}>
                  <SelectValue placeholder={t("settings.method")} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase">{t("settings.provider")}</span>
              <Select
                value={form.provider}
                onValueChange={(value) => form.setProvider(value as PaymentProvider)}
              >
                <SelectTrigger style={settingsFieldStyle}>
                  <SelectValue placeholder={t("settings.provider")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS_BY_METHOD[form.paymentMethod].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase">{t("settings.displayName")}</span>
              <Input
                value={form.credentialName}
                onChange={(event) => form.setCredentialName(event.target.value)}
                style={settingsFieldStyle}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase">{t("settings.publicPayload")}</span>
              <Textarea
                value={form.publicPayload}
                onChange={(event) => form.setPublicPayload(event.target.value)}
                rows={4}
                style={settingsFieldStyle}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase">{t("settings.secretPayload")}</span>
              <Textarea
                value={form.secretPayload}
                onChange={(event) => form.setSecretPayload(event.target.value)}
                rows={4}
                style={settingsFieldStyle}
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              loading={form.savingCredential}
              disabled={!shop || form.credentialName.length < 2}
              className="justify-self-start"
            >
              {t("settings.saveCredential")}
            </Button>
          </form>

          {credentials.length > 0 ? (
            <div className="grid content-start gap-2">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="rounded-brutal bg-brutal-bg p-3 shadow-brutal-sm"
                  style={settingsFieldStyle}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{credential.display_name}</p>
                      <p className="text-xs font-bold text-gray-600">
                        {credential.payment_method} / {credential.provider}
                      </p>
                    </div>
                    <Badge variant={credential.status === "ACTIVE" ? "success" : "secondary"}>
                      {credential.status}
                    </Badge>
                  </div>
                  <pre
                    className="mt-2 overflow-auto rounded bg-brutal-muted p-2 text-[11px] font-bold"
                    style={settingsFieldStyle}
                  >
                    {JSON.stringify(credential.public_payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
