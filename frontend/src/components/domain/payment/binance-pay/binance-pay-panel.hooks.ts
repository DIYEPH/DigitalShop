import { useMemo } from "react";
import type { BinancePayPanelProps } from "./binance-pay-panel.types";
import { DEFAULT_BINANCE_USERNAME } from "./binance-pay-panel.constants";

function formatCreatedAt(value: string, lang: BinancePayPanelProps["lang"]) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export function useBinancePayPanel({ lang, order, payment }: BinancePayPanelProps) {
  const raw = payment as Record<string, unknown>;
  const binanceId = String(raw.binance_id ?? raw.binance_pay_id ?? "");
  const transferNote = String(raw.payment_code ?? raw.note ?? "");
  const binanceUsername = String(raw.binance_username ?? raw.username ?? DEFAULT_BINANCE_USERNAME);
  const createdAt = useMemo(() => formatCreatedAt(order.created_at, lang), [order.created_at, lang]);

  return {
    binanceId,
    transferNote,
    binanceUsername,
    createdAt,
  };
}

