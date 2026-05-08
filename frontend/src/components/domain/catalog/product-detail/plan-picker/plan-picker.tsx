"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui";
import type { PlanPickerProps } from "./plan-picker.types";
import styles from "./plan-picker.module.scss";

export function PlanPicker({ plans, selectedId, onSelect, label }: PlanPickerProps) {
  if (plans.length === 0) return null;
  const fallbackId = plans[0]?.id ?? null;

  return (
    <div className={styles.root}>
      <div className={styles.label}>{label}</div>
      <div className={styles.grid}>
        {plans.map((p) => {
          const active = p.id === selectedId || (!selectedId && fallbackId === p.id);
          return (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="md"
              onClick={() => onSelect(p.id)}
              className={cn(styles.option, active && styles.optionActive)}
            >
              {p.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
