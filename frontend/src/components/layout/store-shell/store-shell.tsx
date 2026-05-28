"use client";

import { StoreHeader } from "../store-header";
import { StoreFooter } from "../store-footer";
import { EventCarouselModal } from "@/components/domain/events/event-carousel-modal";
import { cn } from "@/lib/utils/cn";
import styles from "./store-shell.module.scss";
import type { StoreShellProps } from "./store-shell.types";
import { useStoreShell } from "./store-shell.hooks";

export function StoreShell({
  lang,
  dict,
  children,
}: StoreShellProps) {
  const { eventModalOpen, openEventModal, closeEventModal } = useStoreShell();

  return (
    <div className={cn(styles.bg, "min-h-screen")}>
      <div className={cn(styles.frame, "min-h-screen flex flex-col")}>
        <StoreHeader lang={lang} dict={dict} onOpenEvents={openEventModal} />
        <main className={styles.main}>{children}</main>
        <StoreFooter lang={lang} dict={dict} />
        <EventCarouselModal lang={lang} dict={dict} open={eventModalOpen} onClose={closeEventModal} />
      </div>
    </div>
  );
}
