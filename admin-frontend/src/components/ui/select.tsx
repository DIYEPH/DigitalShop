"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldClassName } from "@/components/ui/field-styles";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  uiSize?: "md" | "sm";
};

export function Select({ className, uiSize = "md", ...props }: Props) {
  const sizes = {
    md: "h-8 text-xs",
    sm: "h-7 text-[11px]",
  } as const;

  return <select className={fieldClassName(cn(sizes[uiSize], className))} {...props} />;
}
