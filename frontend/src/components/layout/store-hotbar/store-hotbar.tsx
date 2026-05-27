"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import styles from "./store-hotbar.module.scss";

type StoreHotbarProps = {
  lang: Locale;
  dict: Dictionary;
};

export function StoreHotbar({ lang, dict }: StoreHotbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accountsHref = `/${lang}/products`;
  const smsHref = `/${lang}/sms`;

  const smsActive = pathname === smsHref || pathname.startsWith(`${smsHref}/`);
  const accountsActive = !smsActive;

  function handleAccountsClick() {
    router.push(accountsHref);
  }

  function handleSmsClick() {
    router.push(smsHref);
  }

  return (
    <div className={styles.wrap} role="tablist" aria-label={dict.store.title}>
      <div className={styles.tabs}>
        <Button
          type="button"
          variant="ghost"
          size="md"
          role="tab"
          aria-selected={accountsActive}
          className={cn(styles.tab, accountsActive && styles.tabActive)}
          onClick={handleAccountsClick}
        >
          {dict.store.hotbarAccountsTab}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          role="tab"
          aria-selected={smsActive}
          className={cn(styles.tab, smsActive && styles.tabActive)}
          onClick={handleSmsClick}
        >
          {dict.store.hotbarSmsTab}
        </Button>
      </div>
    </div>
  );
}
