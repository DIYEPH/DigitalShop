import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import styles from "./quantity-stepper.module.scss";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  decrementLabel,
  incrementLabel,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
  className?: string;
}) {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;
  const nextValue = (value: number) => Math.min(max ?? value, Math.max(min, value));

  return (
    <div className={cn(styles.root, className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.stepperButton}
        aria-label={decrementLabel}
        disabled={!canDecrement}
        onClick={() => onChange(nextValue(value - 1))}
      >
        −
      </Button>
      <span className={styles.value}>{value}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={styles.stepperButton}
        aria-label={incrementLabel}
        disabled={!canIncrement}
        onClick={() => onChange(nextValue(value + 1))}
      >
        +
      </Button>
    </div>
  );
}
