"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldFocus } from "@/components/ui/field-styles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  uiSize?: "md" | "sm";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  uiSize = "md",
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  const base = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150",
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap",
    fieldFocus,
  );

  const variants = {
    primary:
      "bg-gradient-brand text-primary-foreground shadow-(--shadow-sm) hover:opacity-95",
    ghost: "border border-border bg-surface text-foreground hover:bg-muted",
    danger: "bg-danger text-danger-foreground hover:opacity-90",
  } as const;

  const sizes = {
    md: "h-9 px-4 text-sm",
    sm: "h-8 px-3 text-xs",
  } as const;

  return (
    <button
      className={cn(base, variants[variant], sizes[uiSize], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="icon-sm animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
