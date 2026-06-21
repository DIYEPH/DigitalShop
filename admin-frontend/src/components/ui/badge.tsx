import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "success" | "warning" | "muted" | "danger";

const toneClass: Record<BadgeTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-danger/10 text-danger",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

/** Pill trạng thái — thay `<span className="bg-success/10 …">`. */
export function Badge({
  tone = "muted",
  className,
  children,
  ...props
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function stockBadgeTone(status: string): BadgeTone {
  if (status === "AVAILABLE") return "success";
  if (status === "RESERVED") return "warning";
  return "muted";
}

export function orderStatusBadgeTone(status: string): BadgeTone {
  if (status === "DELIVERED") return "success";
  if (status === "PAID") return "muted";
  if (status === "CANCELLED" || status === "FAILED") return "danger";
  return "warning";
}

export function userRoleBadgeTone(role: string): BadgeTone {
  return role === "ADMIN" ? "success" : "muted";
}

export function userStatusBadgeTone(status: string): BadgeTone {
  return status === "BANNED" ? "danger" : "success";
}
