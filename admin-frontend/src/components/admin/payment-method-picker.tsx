"use client";

import { Button, Label } from "@/components/ui";
import { cn } from "@/lib/cn";

export type VariantPaymentMethod = "USDT" | "BINANCE" | "BALANCE";

export const PAYMENT_METHOD_OPTIONS: VariantPaymentMethod[] = [
  "USDT",
  "BINANCE",
  "BALANCE",
];

const PAYMENT_METHOD_LABELS: Record<VariantPaymentMethod, string> = {
  USDT: "USDT (crypto)",
  BINANCE: "Binance Pay",
  BALANCE: "Số dư ví",
};

type Props = {
  value: VariantPaymentMethod[];
  onChange: (next: VariantPaymentMethod[]) => void;
  className?: string;
};

export function PaymentMethodPicker({ value, onChange, className }: Props) {
  const toggle = (method: VariantPaymentMethod) => {
    if (value.includes(method)) {
      onChange(value.filter((m) => m !== method));
    } else {
      onChange([...value, method]);
    }
  };

  return (
    <div className={cn("grid gap-1", className)}>
      <Label>Phương thức thanh toán</Label>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHOD_OPTIONS.map((method) => (
          <Button
            key={method}
            type="button"
            uiSize="sm"
            variant={value.includes(method) ? "primary" : "ghost"}
            onClick={() => toggle(method)}
          >
            {PAYMENT_METHOD_LABELS[method]}
          </Button>
        ))}
      </div>
    </div>
  );
}
