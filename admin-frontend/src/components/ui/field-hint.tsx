import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLParagraphElement>;

export function FieldHint({ className, ...props }: Props) {
  return <p className={cn("text-xs text-gray-600", className)} {...props} />;
}
