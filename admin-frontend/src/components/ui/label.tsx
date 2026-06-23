import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLSpanElement> & {
  required?: boolean;
};

/** Text nhãn field — đặt trong `<label className="grid">` bọc Input. */
export function Label({ className, children, required, ...props }: Props) {
  return (
    <span className={cn("text-xs font-semibold text-muted-foreground", className)} {...props}>
      {children}
      {required ? <span className="text-danger"> *</span> : null}
    </span>
  );
}
