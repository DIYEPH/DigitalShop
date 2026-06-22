import { cn } from "@/lib/cn";

export const fieldFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function fieldClassName(className?: string) {
  return cn(
    "w-full rounded-md border border-border bg-surface px-2.5 text-foreground",
    "outline-none transition-colors placeholder:text-muted-foreground",
    "focus-visible:border-ring",
    fieldFocus,
    className,
  );
}
