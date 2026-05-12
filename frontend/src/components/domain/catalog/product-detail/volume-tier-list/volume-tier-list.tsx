"use client";

import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { PROMO_BPS_DENOMINATOR } from "../product-detail.constants";
import type { VolumeTierListProps } from "./volume-tier-list.types";
import styles from "./volume-tier-list.module.scss";

function previewUnit(unitPrice: number, bps: number): number {
  const next = unitPrice * (1 - bps / PROMO_BPS_DENOMINATOR);
  return Math.max(0, Math.round(next * 100) / 100);
}

function pickActiveMin(tiers: VolumeTierListProps["tiers"], quantity: number): number | null {
  let active: number | null = null;
  for (const t of tiers) {
    const mq = Number(t.min_quantity);
    if (Number.isInteger(mq) && quantity >= mq) {
      active = active === null || mq > active ? mq : active;
    }
  }
  return active;
}

export function VolumeTierList({ tiers, quantity, unitPrice, currency, lang, dict }: VolumeTierListProps) {
  if (!tiers || tiers.length === 0) return null;
  const active = pickActiveMin(tiers, quantity);

  return (
    <div className={styles.box}>
      <div className={styles.title}>{dict.store.bulkDiscountTitle}</div>
      <div className={styles.list}>
        {tiers.map((t) => {
          const mq = Number(t.min_quantity);
          const bps = Number(t.discount_bps);
          if (!Number.isInteger(mq) || mq < 2 || !Number.isFinite(bps) || bps <= 0) return null;
          const isActive = active === mq;
          const previewPrice = previewUnit(unitPrice, bps);
          const percent = bps / 100;
          const percentLabel = `-${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2)}%`;
          return (
            <div key={mq} className={cn(styles.row, isActive && styles.rowActive)}>
              <div className={styles.rowLeft}>
                <span className={styles.qtyLabel}>{dict.store.bulkFromItems.replace("{count}", String(mq))}</span>
                <span className={styles.pctBadge}>{percentLabel}</span>
              </div>
              <div className={styles.priceBlock}>
                {formatPrice(previewPrice, currency, lang)}
                <span className={styles.perHint}>/ {dict.store.bulkPerItem}</span>
              </div>
            </div>
          );
        })}
      </div>
      {active !== null ? (
        <div className={styles.footerOk}>{dict.store.bulkUnlocked.replace("{count}", String(active))}</div>
      ) : (
        <div className={styles.footerMuted}>
          {dict.store.bulkAddMore.replace("{count}", String(Math.max(2, Number(tiers[0]?.min_quantity ?? 2)) - quantity))}
        </div>
      )}
    </div>
  );
}
