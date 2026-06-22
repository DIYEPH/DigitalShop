import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLParagraphElement>;

/** Gợi ý / caption dưới field hoặc trong empty state. */
export function FieldHint({ className, ...props }: Props) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}
