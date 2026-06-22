"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
};

export function Card({ className, title, subtitle, children, ...rest }: Props) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-surface p-4 shadow-(--shadow-sm)",
        className,
      )}
      {...rest}
    >
      {title ? (
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      {children ? (
        <div className={cn(title || subtitle ? "mt-3" : "")}>{children}</div>
      ) : null}
    </section>
  );
}
