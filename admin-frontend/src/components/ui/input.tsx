"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldClassName } from "@/components/ui/field-styles";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  uiSize?: "md" | "sm" | "lg";
};

export function Input({ className, uiSize = "md", ...props }: Props) {
  const sizes = {
    md: "h-8 text-xs",
    sm: "h-7 text-[11px]",
    lg: "h-11 text-sm px-3 rounded-xl",
  } as const;

  return (
    <input
      className={fieldClassName(cn(sizes[uiSize], className))}
      {...props}
    />
  );
}
