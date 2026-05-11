"use client";

import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui";
import type { VariantPickerProps } from "./variant-picker.types";
import styles from "./variant-picker.module.scss";

function getDiscountPct(bps: number | null | undefined): number {
  if (typeof bps !== "number" || !Number.isFinite(bps) || bps <= 0) return 0;
  return Math.round(bps / 100);
}

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
  currency,
  fallbackPrice,
  lang,
  label,
}: VariantPickerProps) {
  if (variants.length === 0) return null;

  return (
    <div className={styles.root}>
      <div className={styles.label}>{label}</div>
      <div className={styles.optionsRow}>
        {variants.map((v) => {
          const vPrice = v.prices?.[currency] ?? fallbackPrice;
          const vDiscountPct = getDiscountPct(v.promo_percent_bps ?? null);
          const active = v.id === selectedId;
          const disabled = v.is_active === false;
          return (
            <Button
              key={v.id}
              type="button"
              variant="outline"
              size="md"
              onClick={() => !disabled && onSelect(v.id)}
              disabled={disabled}
              className={cn(
                styles.option,
                active && styles.optionActive,
                disabled && styles.optionDisabled,
              )}
            >
              <span className={styles.row}>
                <span className={styles.name}>{v.name}</span>
                {vDiscountPct > 0 ? (
                  <span className={styles.badge}>-{vDiscountPct}%</span>
                ) : null}
              </span>
              <span className={styles.price}>{formatPrice(vPrice, currency, lang)}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
