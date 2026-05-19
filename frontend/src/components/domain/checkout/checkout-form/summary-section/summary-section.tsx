"use client";

import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PROMO_BPS_DENOMINATOR } from "../checkout-form.constants";
import type { SummarySectionProps } from "./summary-section.types";
import styles from "./summary-section.module.scss";

function calculatePromoDiscount(c: SummarySectionProps["c"]): number {
  return c.items.reduce((acc, it) => {
    const bps = Number(it.promoPercentBps || 0);
    if (!Number.isFinite(bps) || bps <= 0) return acc;
    const unit = it.prices?.[c.chargeCurrency] ?? it.price;
    const sub = unit * it.quantity;
    return acc + (sub * bps) / PROMO_BPS_DENOMINATOR;
  }, 0);
}

export function SummarySection({ lang, dict, c }: SummarySectionProps) {
  const estimatedPromoDiscount = calculatePromoDiscount(c);
  const promoDiscount = c.quote?.promo_discount ?? estimatedPromoDiscount;
  const voucherDiscount = c.quote?.voucher_discount ?? 0;
  const estimatedVolumeDiscount = c.items.reduce((sum, item) => {
    const baseUnit = item.prices?.[c.chargeCurrency] ?? item.price;
    const effectiveUnit = c.unitPrice(item);
    if (!Number.isFinite(baseUnit) || !Number.isFinite(effectiveUnit) || baseUnit <= effectiveUnit) return sum;
    return sum + (baseUnit - effectiveUnit) * item.quantity;
  }, 0);
  const volumeDiscount = c.quote?.volume_discount ?? estimatedVolumeDiscount;
  const total = c.quote?.payable ?? Math.max(0, c.subtotal - promoDiscount);

  return (
    <section className={cn("store-card", styles.section)}>
      <h3 className={styles.title}>{dict.checkout.summary}</h3>
      <ul className={styles.list}>
        {c.items.map((item) => {
          const quoteLine = c.quote?.items?.find((qi) => qi.variant_id === item.variantId);
          const tierBps = quoteLine?.volume_discount_bps ?? null;
          const tierMin = quoteLine?.volume_min_qty ?? null;
          const lineBaseUnit =
            typeof quoteLine?.base_unit_price === "number" && Number.isFinite(quoteLine.base_unit_price)
              ? quoteLine.base_unit_price
              : c.unitPrice(item);
          return (
            <li key={item.lineId} className={styles.line}>
              <span className={styles.lineMain}>
                <span className={styles.truncate}>
                  {item.name}
                  {item.variantName ? ` — ${item.variantName}` : ""} × {item.quantity}
                </span>
                {tierBps && tierMin ? (
                  <span className={styles.tierBadge}>
                    -{(Number(tierBps) / 100).toFixed(0)}% · {dict.checkout.summaryTierFrom.replace("{count}", String(tierMin))}
                  </span>
                ) : null}
              </span>
              <span className={styles.lineAmount}>{formatPrice(lineBaseUnit * item.quantity, c.chargeCurrency, lang)}</span>
            </li>
          );
        })}
      </ul>
      <hr className={styles.divider} />
      {volumeDiscount > 0 ? (
        <div className={styles.discountRow}>
          <span>{dict.checkout.summaryBulkDiscount}</span>
          <span className={styles.discountAmt}>- {formatPrice(volumeDiscount, c.chargeCurrency, lang)}</span>
        </div>
      ) : null}
      {promoDiscount > 0 ? (
        <div className={styles.discountRow}>
          <span>{dict.checkout.summaryPromoDiscount}</span>
          <span className={styles.discountAmt}>- {formatPrice(promoDiscount, c.chargeCurrency, lang)}</span>
        </div>
      ) : null}
      {voucherDiscount > 0 ? (
        <div className={styles.discountRow}>
          <span>{dict.checkout.summaryVoucherDiscount}</span>
          <span className={styles.discountAmt}>- {formatPrice(voucherDiscount, c.chargeCurrency, lang)}</span>
        </div>
      ) : null}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>{dict.cart.total}</span>
        <span className={styles.totalAmt}>{formatPrice(total, c.chargeCurrency, lang)}</span>
      </div>
    </section>
  );
}
