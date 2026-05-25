"use client";

import { formatPrice } from "@/lib/utils/format";
import type { PaymentDetailsProps } from "./payment-details.types";
import styles from "./payment-details.module.scss";

export function PaymentDetails({ lang, dict, payment }: PaymentDetailsProps) {
  if (payment.method === "USDT") {
    const raw = payment as Record<string, unknown>;
    const transferNote = String(raw.payment_code ?? raw.note ?? "");
    return (
      <dl className={styles.grid}>
        <dt className={styles.dt}>{dict.checkout.transferNote}</dt>
        <dd className={styles.ddMono}>{transferNote || "-"}</dd>
        <dt className={styles.dt}>{dict.cart.total}</dt>
        <dd className={styles.ddStrong}>{formatPrice(payment.amount, "USDT", lang)}</dd>
      </dl>
    );
  }

  if (payment.method === "BALANCE") {
    return (
      <dl className={styles.grid}>
        <dt className={styles.dt}>{dict.cart.total}</dt>
        <dd className={styles.ddStrong}>{formatPrice(payment.amount, payment.currency, lang)}</dd>
      </dl>
    );
  }

  if (payment.method === "BINANCE") {
    const raw = payment as Record<string, unknown>;
    const binanceId = String(raw.binance_id ?? raw.binance_pay_id ?? "");
    const transferNote = String(raw.payment_code ?? raw.note ?? "");
    return (
      <dl className={styles.grid}>
        <dt className={styles.dt}>{dict.checkout.binanceId}</dt>
        <dd className={styles.ddMono}>{binanceId || "-"}</dd>
        <dt className={styles.dt}>{dict.checkout.transferNote}</dt>
        <dd className={styles.ddMono}>{transferNote || "-"}</dd>
        <dt className={styles.dt}>{dict.cart.total}</dt>
        <dd className={styles.ddStrong}>{formatPrice(payment.amount, "USDT", lang)}</dd>
      </dl>
    );
  }

  return null;
}
