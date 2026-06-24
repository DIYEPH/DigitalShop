"use client";

import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function TableWrap({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-(--shadow-sm)",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2">
      {children}
    </div>
  );
}

export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full text-xs", className)} {...props} />;
}
