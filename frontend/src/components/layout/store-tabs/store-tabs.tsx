import Link from "next/link";
import { Gift, Home, Package, PartyPopper, ShoppingBag, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CartBadge } from "@/components/domain/cart";
import { Button } from "@/components/ui";
import styles from "./store-tabs.module.scss";
import type { ActiveTab, StoreTabsProps } from "./store-tabs.types";

export type { ActiveTab } from "./store-tabs.types";

export function StoreTabs({
  lang,
  dict,
  active,
  onOpenEvents,
}: StoreTabsProps) {
  const tabs: Array<
    | { type: "link"; key: ActiveTab; icon: ReactNode; label: string; href: string }
    | { type: "action"; key: "events"; icon: ReactNode; label: string; onClick?: () => void }
  > = [
    { type: "link", key: "home", icon: <Home aria-hidden />, label: dict.nav.home, href: `/${lang}` },
    { type: "link", key: "store", icon: <ShoppingBag aria-hidden />, label: dict.nav.store, href: `/${lang}/products` },
    { type: "link", key: "deals", icon: <Gift aria-hidden />, label: dict.nav.deals, href: `/${lang}/promotions` },
    { type: "link", key: "cart", icon: <ShoppingCart aria-hidden />, label: dict.nav.cart, href: `/${lang}/cart` },
    { type: "link", key: "orders", icon: <Package aria-hidden />, label: dict.layout.orders, href: `/${lang}/orders` },
    { type: "action", key: "events", icon: <PartyPopper aria-hidden />, label: dict.layout.eventButton, onClick: onOpenEvents },
  ];

  return (
    <nav className={styles.nav} aria-label={dict.layout.primaryNav}>
      {tabs.map((tab) =>
        tab.type === "link" ? (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(styles.item, "relative", tab.key === active && styles.itemActive)}
          >
            <span aria-hidden className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
            {tab.key === "cart" && <CartBadge />}
          </Link>
        ) : (
          <Button
            key={tab.key}
            type="button"
            image
            className={cn(styles.item, styles.eventItem)}
            onClick={tab.onClick}
          >
            <span aria-hidden className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </Button>
        ),
      )}
    </nav>
  );
}
