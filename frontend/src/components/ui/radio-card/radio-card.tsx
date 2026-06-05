"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { RadioCardProps } from "./radio-card.types";
import styles from "./radio-card.module.scss";

function getStateClass(selected: boolean, disabled?: boolean) {
  return cn(selected && styles.selected, disabled && styles.disabled);
}

export function RadioCard({
  selected,
  onSelect,
  disabled,
  name,
  value,
  showRadio,
  children,
  trailing,
  className,
}: RadioCardProps) {
  if (showRadio) {
    return (
      <label className={cn(styles.root, getStateClass(selected, disabled), className)}>
        <input
          type="radio"
          name={name}
          value={value}
          checked={selected}
          onChange={onSelect}
          disabled={disabled}
          className={styles.input}
        />
        <span className={styles.label}>{children}</span>
        {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      </label>
    );
  }

  return (
    <Button
      type="button"
      onClick={() => !disabled && onSelect()}
      disabled={disabled}
      aria-pressed={selected}
      image
      className={cn(styles.root, getStateClass(selected, disabled), className)}
    >
      <span className={styles.label}>{children}</span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
    </Button>
  );
}
