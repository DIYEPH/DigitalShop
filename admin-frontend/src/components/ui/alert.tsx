"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "error" | "warning" | "success";

const toneClass: Record<AlertTone, string> = {
  error:
    "rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger",
  warning:
    "rounded-lg border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning",
  success:
    "rounded-lg border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success",
};

type Props = HTMLAttributes<HTMLDivElement> & {
  tone: AlertTone;
  children: ReactNode;
  onDismiss?: () => void;
};

/** Thông báo inline (lỗi API, cảnh báo, thành công) — không dùng div + class alert thủ công. */
export function Alert({
  tone,
  children,
  onDismiss,
  className,
  ...props
}: Props) {
  return (
    <div
      className={cn(toneClass[tone], "flex items-start gap-2", className)}
      role="alert"
      {...props}
    >
      <div className="min-w-0 flex-1 whitespace-pre-wrap">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          className="shrink-0 text-current opacity-70 transition-opacity hover:opacity-100"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
        >
          <X className="icon-sm" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
