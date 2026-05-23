"use client";

import { Button, StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useOrdersList } from "./orders-list.hooks";
import type { OrderRow, OrdersListProps } from "./orders-list.types";
import styles from "./orders-list.module.scss";

function getOrderTitle(o: OrderRow): string {
  const first = o.items?.[0];
  if (!first) return "";
  const name = first.snapshot_variant_name || "";
  const qty = Number(first.quantity || 0);
  if (!name) return "";
  return qty > 0 ? `${name} x ${qty}` : name;
}

export function OrdersList({ lang, dict }: OrdersListProps) {
  const { token, hydrated, orders, loading, error, empty } = useOrdersList(lang, {
    loadOrdersFailed: dict.checkout.loadOrdersFailed,
  });

  if (hydrated && !token) {
    return (
      <div className={cn("store-card", styles.loginCard)}>
        <p className={styles.loginKicker}>{dict.checkout.ordersTitle}</p>
        <h1 className={styles.loginTitle}>{dict.checkout.ordersLoginTitle}</h1>
        <p className={styles.softFg}>{dict.checkout.ordersLoginDesc}</p>
        <Button href={`/${lang}/login`} size="lg" className="mt-stack-relaxed">
          {dict.checkout.signIn}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={cn("store-card", styles.toolbarCard)}>
        <div className={styles.toolbarRow}>
          <h3 className={styles.toolbarTitle}>{dict.checkout.ordersTitle}</h3>
          <Button href={`/${lang}/products`} variant="ghost" size="sm">
            {dict.cart.continueShopping}
          </Button>
        </div>

        {loading ? <p className={styles.loading}>…</p> : null}
        {error ? <p className={styles.errorBanner}>{error}</p> : null}
        {empty ? <p className={styles.empty}>{dict.checkout.ordersEmpty}</p> : null}
      </div>

      {orders.length > 0 ? (
        <ul className={styles.rowList}>
          {orders.map((o) => (
            <li key={o.id} className={cn("store-card", styles.orderCard)}>
              <div className={styles.orderRow}>
                <div className={styles.orderMain}>
                  <div className={styles.orderIdLine}>
                    <span className={styles.orderId}>#{o.id}</span>
                    <span className={styles.orderTitleText}>{getOrderTitle(o)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <StatusBadge status={o.status} />
                    <span>•</span>
                    <span>{new Date(o.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>{o.payment_method}</span>
                  </div>
                </div>
                <div className={styles.side}>
                  <div className={styles.priceBlock}>
                    <div className={styles.priceLabel}>{dict.cart.total}</div>
                    <div className={styles.priceValue}>{formatPrice(o.total_price, o.currency, lang)}</div>
                  </div>
                  <Button href={`/${lang}/orders/${o.id}`} variant="outline" size="sm">
                    {dict.checkout.details}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
