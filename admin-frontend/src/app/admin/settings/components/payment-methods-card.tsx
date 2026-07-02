"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import {
  Alert,
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
  Switch,
} from "@/components/ui";
import type { ShopPaymentMethod } from "@/lib/api/shops";
import {
  CRYPTO_NETWORKS,
  METHOD_HINT_KEY,
  METHOD_LABEL_KEY,
  type CryptoNetwork,
} from "../payment-methods.constants";
import { usePaymentMethods } from "../payment-methods.hooks";
import type { Translator } from "../settings.types";

type Props = { t: Translator };

export function PaymentMethodsCard({ t }: Props) {
  const pm = usePaymentMethods(t);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.paymentMethods")}</CardTitle>
        <p className="text-xs font-semibold text-gray-600">
          {t("settings.paymentMethodsHint")}
        </p>
      </CardHeader>
      <CardContent>
        {pm.notices.error ? (
          <Alert variant="danger" className="mb-3">
            {pm.notices.error}
          </Alert>
        ) : null}
        {pm.notices.success ? (
          <Alert variant="success" className="mb-3">
            {pm.notices.success}
          </Alert>
        ) : null}

        {!pm.shopId ? (
          <p className="text-sm font-semibold text-gray-600">
            {t("settings.chooseShop")}
          </p>
        ) : pm.loading ? (
          <p className="text-sm font-semibold text-gray-600">
            {t("common.loading")}
          </p>
        ) : (
          <div className="grid gap-3">
            {pm.order.map((method, index) => (
              <div
                key={method}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) pm.reorderByDrag(dragIndex, index);
                  setDragIndex(null);
                }}
                className="rounded-brutal border-3 border-brutal bg-brutal-bg shadow-brutal-sm"
              >
                <div className="flex flex-wrap items-center gap-2 border-b-3 border-brutal p-3">
                  <span
                    aria-label={t("settings.pay.dragHint")}
                    title={t("settings.pay.dragHint")}
                    className="cursor-grab text-gray-600 hover:text-brutal-fg"
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-black uppercase tracking-wide text-brutal-fg">
                      {t(METHOD_LABEL_KEY[method])}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600">
                      {t(METHOD_HINT_KEY[method])}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-600">
                      #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("settings.pay.moveUp")}
                      disabled={index === 0 || pm.reordering}
                      onClick={() => pm.move(method, -1)}
                      className="h-8 w-8"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("settings.pay.moveDown")}
                      disabled={index === pm.order.length - 1 || pm.reordering}
                      onClick={() => pm.move(method, 1)}
                      className="h-8 w-8"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={methodEnabled(pm.forms, method)}
                      onCheckedChange={(v) => pm.toggle(method, v)}
                      aria-label={t(METHOD_LABEL_KEY[method])}
                    />
                  </div>
                </div>

                <div className="grid gap-3 p-3">
                  {method === "CRYPTO" ? (
                    <CryptoFields t={t} pm={pm} />
                  ) : method === "BINANCE" ? (
                    <BinanceFields t={t} pm={pm} />
                  ) : (
                    <BankFields t={t} pm={pm} />
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={pm.savingMethod === method}
                      onClick={() => pm.save(method)}
                    >
                      {t("settings.saveCredential")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[11px] font-semibold text-gray-600">
              {t("settings.pay.autoVerifyTodo")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function methodEnabled(
  forms: ReturnType<typeof usePaymentMethods>["forms"],
  method: ShopPaymentMethod,
): boolean {
  return forms[method].enabled;
}

type FieldsProps = {
  t: Translator;
  pm: ReturnType<typeof usePaymentMethods>;
};

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-brutal-fg">
        {label}
      </span>
      {children}
    </label>
  );
}

function CryptoFields({ t, pm }: FieldsProps) {
  return (
    <div className="grid gap-3">
      {pm.forms.CRYPTO.networks.map((row, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <Labeled label={t("settings.pay.network")}>
              <Select
                value={row.network}
                onValueChange={(v) =>
                  pm.setNetwork(index, { network: v as CryptoNetwork })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRYPTO_NETWORKS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Labeled>
          </div>
          <div className="min-w-[220px] flex-1">
            <Labeled label={t("settings.pay.walletAddress")}>
              <Input
                value={row.wallet_address}
                onChange={(e) =>
                  pm.setNetwork(index, { wallet_address: e.target.value })
                }
                className="font-mono"
              />
            </Labeled>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("common.delete")}
            onClick={() => pm.removeNetwork(index)}
            className="h-11 w-11"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={pm.addNetwork}>
          {t("settings.pay.addNetwork")}
        </Button>
      </div>
    </div>
  );
}

function BinanceFields({ t, pm }: FieldsProps) {
  const f = pm.forms.BINANCE;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Labeled label={t("settings.pay.payId")}>
        <Input
          value={f.pay_id}
          onChange={(e) => pm.updateBinance({ pay_id: e.target.value })}
        />
      </Labeled>
      <Labeled label={t("settings.pay.qrUrl")}>
        <Input
          value={f.qr_url}
          onChange={(e) => pm.updateBinance({ qr_url: e.target.value })}
        />
      </Labeled>
      {f.qr_url.trim() ? (
        <div className="sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.qr_url}
            alt="QR"
            className="h-32 w-32 rounded-brutal border-3 border-brutal object-contain"
          />
        </div>
      ) : null}
      <Labeled label={t("settings.pay.apiKey")}>
        <Input
          value={f.api_key}
          onChange={(e) => pm.updateBinance({ api_key: e.target.value })}
          placeholder={f.hasSecret ? t("settings.pay.secretSaved") : undefined}
        />
      </Labeled>
      <Labeled label={t("settings.pay.apiSecret")}>
        <Input
          type="password"
          value={f.api_secret}
          onChange={(e) => pm.updateBinance({ api_secret: e.target.value })}
          placeholder={f.hasSecret ? t("settings.pay.secretSaved") : undefined}
        />
      </Labeled>
    </div>
  );
}

function BankFields({ t, pm }: FieldsProps) {
  const f = pm.forms.BANK;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Labeled label={t("settings.pay.bankName")}>
        <Input
          value={f.bank_name}
          onChange={(e) => pm.updateBank({ bank_name: e.target.value })}
          placeholder="Vietcombank, MBBank, ..."
        />
      </Labeled>
      <Labeled label={t("settings.pay.bankBin")}>
        <Input
          value={f.bank_bin}
          onChange={(e) => pm.updateBank({ bank_bin: e.target.value })}
        />
      </Labeled>
      <Labeled label={t("settings.pay.accountNumber")}>
        <Input
          value={f.account_number}
          onChange={(e) => pm.updateBank({ account_number: e.target.value })}
          className="font-mono"
        />
      </Labeled>
      <Labeled label={t("settings.pay.accountHolder")}>
        <Input
          value={f.account_holder}
          onChange={(e) => pm.updateBank({ account_holder: e.target.value })}
        />
      </Labeled>
      <Labeled label={t("settings.pay.apiKey")}>
        <Input
          value={f.api_key}
          onChange={(e) => pm.updateBank({ api_key: e.target.value })}
          placeholder={f.hasSecret ? t("settings.pay.secretSaved") : undefined}
        />
      </Labeled>
    </div>
  );
}
