"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBadge } from "@/components/ui";
import { useOrderDetails } from "@/components/domain/orders/order-details/order-details.hooks";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { PaymentDetails } from "./payment-details";
import { BinancePayPanel } from "./binance-pay";
import styles from "./payment-page-card.module.scss";

type PaymentPageCardProps = {
  lang: Locale;
  dict: Dictionary;
  id: string;
};

export function PaymentPageCard({ lang, dict, id }: PaymentPageCardProps) {
  const router = useRouter();
  const { token, hydrated, order, payment, loading, error } = useOrderDetails(
    lang,
    id,
    {
      loadOrderFailed: dict.checkout.loadOrderFailed,
      cancelOrderFailed: dict.checkout.cancelOrderFailed,
    },
  );
  const [now, setNow] = useState(0);
  const isTimedPending = order?.status === "PENDING" && order?.payment_method === "BINANCE";

  useEffect(() => {
    if (!isTimedPending) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isTimedPending]);

  useEffect(() => {
    if (!order) return;
    if (order.status !== "PAID" && order.status !== "DELIVERED") return;
    const timer = window.setTimeout(() => {
      router.replace(`/${lang}/orders/${order.id}`);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [order, lang, router]);

  const countdown = useMemo(() => {
    if (!order || !isTimedPending || !order.expires_at) return null;
    const expiresAt = new Date(order.expires_at).getTime();
    const referenceNow = now || expiresAt - (order.seconds_left ?? 0) * 1000;
    const leftSec = Math.max(0, Math.floor((expiresAt - referenceNow) / 1000));
    const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
    const ss = String(leftSec % 60).padStart(2, "0");
    return { mm, ss, leftSec };
  }, [order, isTimedPending, now]);

  if (hydrated && !token) {
    return (
      <div className={cn("store-card", styles.loginCard)}>
        <p className={styles.softFg}>{dict.checkout.loginRequired}</p>
        <Button href={`/${lang}/login`} size="md" className="mt-stack-relaxed">
          {dict.checkout.signIn}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("store-card", styles.shell)}>
      {loading ? <p className={styles.loading}>…</p> : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      {order && payment ? (
        <div className={styles.paymentSection}>
          {payment.method === "BINANCE" ? (
            <BinancePayPanel
              lang={lang}
              dict={dict}
              order={order}
              payment={payment}
              countdown={countdown ? { mm: countdown.mm, ss: countdown.ss } : null}
            />
          ) : (
            <>
              <div className={styles.statusBar}>
                <span className={styles.labelMuted}>{dict.checkout.status}</span>
                <StatusBadge status={order.status} />
              </div>
              {countdown ? (
                <div className={styles.countdownBox}>
                  <div className={styles.countdownRow}>
                    <span className={styles.countdownLabel}>{dict.checkout.timeLeftToComplete}</span>
                    <span className={styles.countdownClock}>
                      {countdown.mm}:{countdown.ss}
                    </span>
                  </div>
                </div>
              ) : null}
              <h4 className={styles.instructionsTitle}>{dict.checkout.payInstructions}</h4>
              <PaymentDetails lang={lang} dict={dict} payment={payment} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
