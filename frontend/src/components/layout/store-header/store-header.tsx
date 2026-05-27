"use client";

import Image from "next/image";
import { LangSwitcher } from "../lang-switcher";
import { AuthButton } from "../auth-button";
import { BalanceWidget } from "../balance-widget";
import { AccountMenu } from "../account-menu";
import styles from "./store-header.module.scss";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { StoreTabs } from "../store-tabs";
import type { StoreHeaderProps } from "./store-header.types";
import { useStoreHeader } from "./store-header.hooks";

export function StoreHeader({
  lang,
  dict,
  onOpenEvents,
}: StoreHeaderProps) {
  const { hasToken, toggleScheme, logoSrc, pathSuffix, activeTab } = useStoreHeader({
    lang,
    dict,
    onOpenEvents,
  });

  return (
    <header className={cn(styles.topbar, "px-header-x flex flex-col justify-center")}>
      <div className={cn(styles.toprow,"flex items-center justify-between")}>
        <div className={styles.brand}>
          <Button
            type="button"
            image
            className={styles.logo}
            onClick={toggleScheme}
            aria-label={dict.layout.toggleTheme}
          >
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={dict.brand}
                width={40}
                height={40}
                priority
              />
            ) : (
              <span aria-hidden className={styles.logoFallback}>DS</span>
            )}
          </Button>
          <div>
            <div className={styles.brandTitle}>{dict.brand}</div>
          </div>
        </div>

        <form role="search" className={styles.search}>
          <input
            type="search"
            name="q"
            placeholder={dict.nav.search}
            className={styles.searchInput}
          />
          <span aria-hidden className={styles.searchIcon}>
            <Image src="/icons/search.svg" alt="" width={16} height={16} />
          </span>
        </form>

        <div className={styles.actions}>
          {hasToken ? (
            <>
              <BalanceWidget lang={lang} dict={dict} />
              <AccountMenu lang={lang} dict={dict} />
            </>
          ) : (
            <AuthButton lang={lang} dict={dict} />
          )}

          <div className={styles.actionsRight}>
            <LangSwitcher lang={lang} pathSuffix={pathSuffix} dict={dict} />
          </div>
        </div>
      </div>
      <Card padded={false} className={styles.tabsCard}>
        <StoreTabs lang={lang} dict={dict} active={activeTab} onOpenEvents={onOpenEvents} />
      </Card>
    </header>
  );
}
