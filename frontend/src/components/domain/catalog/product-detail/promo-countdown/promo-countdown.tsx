"use client";

import { usePromoCountdown } from "./promo-countdown.hooks";
import type { PromoCountdownProps } from "./promo-countdown.types";
import styles from "./promo-countdown.module.scss";

export function PromoCountdown({ endsAt, limitedLabel }: PromoCountdownProps) {
  const { active, text } = usePromoCountdown(endsAt);
  if (!active || !text) return null;

  return (
    <div className={styles.row}>
      <div className={styles.label}>{limitedLabel}</div>
      <div className={styles.timer} suppressHydrationWarning>
        Ends in {text}
      </div>
    </div>
  );
}
