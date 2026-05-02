"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { useTopupView } from "./topup-view.hooks";
import type { TopupViewProps } from "./topup-view.types";
import styles from "./topup-view.module.scss";

export function TopupView({ lang, dict }: TopupViewProps) {
  const { usdt } = useTopupView(lang);

  return (
    <div className={styles.shell}>
      <div className={cn("store-card", styles.card)}>
        <p className={styles.kicker}>{dict.checkout.topupKicker}</p>
        <h1 className={styles.title}>{dict.checkout.topupTitle}</h1>
        <p className={styles.intro}>{dict.checkout.topupInfo}</p>

        <div className={styles.balanceRow}>
          <span className={styles.labelMuted}>USDT</span>
          <span className={styles.amount}>{usdt.toFixed(2)} USDT</span>
        </div>

        <p className={styles.hint}>{dict.checkout.topupHint}</p>

        <div className={styles.actions}>
          <Button href={`/${lang}/checkout`} variant="primary">
            {dict.checkout.backToCheckout}
          </Button>
        </div>
      </div>
    </div>
  );
}
