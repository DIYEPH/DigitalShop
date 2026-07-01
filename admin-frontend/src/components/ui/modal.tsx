"use client";

import { useEffect, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ModalProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ open, onClose, children, className, ...props }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 md:items-center",
        className,
      )}
      onClick={onClose}
      {...props}
    >
      {children}
    </div>
  );
}
