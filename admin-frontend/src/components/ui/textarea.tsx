"use client";

import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldClassName } from "@/components/ui/field-styles";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: Props) {
  return <textarea className={fieldClassName(cn("py-2 text-xs font-mono", className))} {...props} />;
}
