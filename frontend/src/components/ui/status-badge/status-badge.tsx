import { cn } from "@/lib/utils/cn";
import type { StatusBadgeProps } from "./status-badge.types";
import styles from "./status-badge.module.scss";

function variantFor(status: StatusBadgeProps["status"]): "ok" | "bad" | "pending" {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "ok";
    case "CANCELLED":
      return "bad";
    default:
      return "pending";
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const v = variantFor(status);
  return (
    <span className={cn(styles.badge, v === "ok" && styles.ok, v === "bad" && styles.bad, v === "pending" && styles.pending, className)}>
      {status}
    </span>
  );
}
