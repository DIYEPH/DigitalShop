"use client";

import styles from "./balance-widget.module.scss";
import { Button } from "@/components/ui";
import { useBalanceWidget } from "./balance-widget.hooks";
import type { BalanceWidgetProps } from "./balance-widget.types";

export function BalanceWidget({ lang, dict }: BalanceWidgetProps) {
  const { token, hydrated, usdt } = useBalanceWidget(lang);
  const handlePlusClick = () => {
    const message = lang === "vi" ? "Chức năng đang phát triển." : "This feature is under development.";
    window.alert(message);
  };

  if (hydrated && !token) return null;

  return (
    <div className={styles.card}>
      <div className={styles.body}>
        <div className={styles.label}>{dict.layout.myBalance}</div>
        <div className={styles.amountRow}>
          <span className={styles.dot} aria-hidden />
          <span>{usdt.toFixed(2)} USDT</span>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" className={styles.plus} aria-label={dict.layout.addBalance} onClick={handlePlusClick}>
        +
      </Button>
    </div>
  );
}
