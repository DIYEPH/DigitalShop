"use client";

import { useEffect, useState } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useOrderDetails } from "./order-details.hooks";
import type { OrderDetailsProps } from "./order-details.types";
import styles from "./order-details.module.scss";

export function OrderDetails({ lang, dict, id }: OrderDetailsProps) {
  const { token, hydrated, order, loading, error, title, cancelPending, cancelPendingLoading } = useOrderDetails(
    lang,
    id,
    {
      loadOrderFailed: dict.checkout.loadOrderFailed,
      cancelOrderFailed: dict.checkout.cancelOrderFailed,
    },
    { includePayment: false },
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [now, setNow] = useState(0);
  const deliveredItems = order?.items.filter((it) => (it.delivered_payloads?.length ?? 0) > 0) ?? [];
  const waitingItems = order?.items.filter((it) => it.fulfillment_type === "PREORDER" && (it.delivered_payloads?.length ?? 0) === 0) ?? [];

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const copyPayload = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch {
      setCopiedKey(null);
    }
  };

  const warrantyCountdown = (expiresAt: string | null | undefined) => {
    if (!expiresAt || now <= 0) return null;
    const ms = new Date(expiresAt).getTime() - now;
    if (!Number.isFinite(ms) || ms <= 0) return dict.checkout.expired;
    const totalSec = Math.floor(ms / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  if (hydrated && !token) {
    return (
      <div className={cn("store-card", styles.loginCard)}>
        <p className={styles.softFg}>{dict.checkout.loginRequired}</p>
        <Button href={`/${lang}/login`} size="md" className="mt-stack-relaxed">
          {dict.checkout.signIn}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={cn("store-card", styles.cardPad)}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <div className={styles.orderTitle}>
              Đơn hàng <span className={styles.orderId}>#{id}</span>
              {title ? <span className={styles.titleSuffix}> — {title}</span> : null}
            </div>
            {order ? (
              <div className={styles.metaRow}>
                <span>{new Date(order.created_at).toLocaleString()}</span>
                <span>•</span>
                <span>{order.payment_method}</span>
              </div>
            ) : null}
          </div>
          <div className={styles.actions}>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowContactModal(true)}>
              {dict.checkout.chatWithAdmin}
            </Button>
            <Button href={`/${lang}/orders`} variant="ghost" size="sm">
              {dict.checkout.back}
            </Button>
          </div>
        </div>

        {loading ? <p className={styles.loading}>…</p> : null}
        {error ? <p className={styles.errorBanner}>{error}</p> : null}
      </div>

      {order ? (
        <div className={styles.orderBody}>
          {order.status !== "DELIVERED" ? (
            <div className={cn("store-card", styles.bannerPrimary)}>
              <div className={styles.statusLine}>
                <StatusBadge status={order.status} />
                <span className={styles.statusHint}>
                  {order.status === "PENDING"
                    ? dict.checkout.waitingPayment
                    : order.status === "PAID"
                      ? dict.checkout.paidProcessing
                      : dict.checkout.orderCancelled}
                </span>
              </div>
              {order.status === "PENDING" ? (
                <div className={styles.pendingActions}>
                  <Button href={`/${lang}/payment/${order.id}`} variant="primary">
                    {dict.checkout.pendingContinue}
                  </Button>
                  <Button type="button" variant="outline" disabled={cancelPendingLoading} onClick={() => void cancelPending()}>
                    {cancelPendingLoading ? dict.checkout.pendingCancelling : dict.checkout.pendingCancel}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {order.delivery_note ? (
            <div className={cn("store-card", styles.cardPad)}>
              <h3 className={styles.sectionTitle}>{dict.checkout.deliveryDetails}</h3>
              <div className={styles.deliveryNote}>{order.delivery_note}</div>
            </div>
          ) : null}

          {deliveredItems.length > 0 ? (
            <div className={cn("store-card", styles.bannerPrimary)}>
              <div className={styles.deliveredHeader}>
                <span className={styles.badgeSuccess}>{dict.checkout.delivered}</span>
                <h3 className={styles.sectionTitleSm}>{dict.checkout.deliveredCredentials}</h3>
              </div>
              <div className={styles.variantStack}>
                {deliveredItems.map((it) => {
                  const allPayloads = (it.delivered_payloads ?? []).join("\n");
                  return (
                    <div key={`pl-${it.variant_id}`} className={styles.variantCard}>
                      <div className={styles.variantTitleRow}>
                        <div className={styles.variantName}>
                          {it.product_name}
                          {it.snapshot_variant_name ? ` — ${it.snapshot_variant_name}` : ""}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => void copyPayload(allPayloads, `all:${it.variant_id}`)}
                        >
                          {copiedKey === `all:${it.variant_id}` ? dict.checkout.copied : dict.checkout.copyAll}
                        </Button>
                      </div>
                      <ul className={styles.payloadList}>
                        {(it.delivered_payloads ?? []).map((p, idx) => (
                          <li key={idx} className={styles.payloadRow}>
                            <span className={styles.idxCell}>{idx + 1}.</span>
                            <span className={styles.payloadCell}>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {waitingItems.length > 0 && order.status !== "CANCELLED" && order.status !== "DELIVERED" ? (
            <div className={cn("store-card", styles.cardPad)}>
              <div className={styles.waitingHeader}>
                <span className={styles.badgeWarning}>{dict.checkout.pendingDelivery}</span>
                <h3 className={styles.sectionTitleSm}>{dict.checkout.waitingItems}</h3>
              </div>
              <ul className={styles.waitList}>
                {waitingItems.map((it) => (
                  <li key={`wait-${it.variant_id}`} className={styles.waitItem}>
                    <div className={styles.waitName}>
                      {it.product_name}
                      {it.snapshot_variant_name ? ` — ${it.snapshot_variant_name}` : ""}
                    </div>
                    <div className={styles.waitMeta}>{dict.checkout.preorder}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={cn("store-card", styles.cardPad)}>
            <h3 className={styles.sectionTitle}>{dict.checkout.summary}</h3>
            <ul className={styles.summaryList}>
              {order.items.map((it) => (
                <li key={`${it.variant_id}`} className={styles.summaryRow}>
                  <div className={styles.summaryLeft}>
                    <div className={styles.lineTitle}>
                      {it.product_name}
                      {it.snapshot_variant_name ? ` — ${it.snapshot_variant_name}` : ""}
                    </div>
                    <div className={styles.lineQty}>
                      {dict.checkout.qtyShort}: {it.quantity}
                    </div>
                    <div className={styles.lineKind}>
                      {it.fulfillment_type === "PREORDER" ? dict.checkout.preorder : dict.checkout.instant}
                    </div>
                    {it.warranty?.warranty_expires_at && (order.status === "PAID" || order.status === "DELIVERED") ? (
                      <span className={styles.warrantyMeta}>
                        {dict.checkout.warrantyLeft}: {warrantyCountdown(it.warranty.warranty_expires_at)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.summaryRight}>
                    <div className={styles.lineTotal}>{formatPrice(it.unit_price * it.quantity, order.currency, lang)}</div>
                    <div className={styles.unitHint}>
                      {formatPrice(it.unit_price, order.currency, lang)} / {dict.checkout.perItem}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <hr className={styles.divider} />
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>{dict.cart.total}</span>
              <span className={styles.totalAmount}>{formatPrice(order.total_price, order.currency, lang)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {showContactModal ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalPanel}>
            <h3 className={styles.modalTitle}>{dict.checkout.chatWithAdmin}</h3>
            <p className={styles.modalText}>{dict.checkout.chatSupportTitle}</p>
            <a href="https://t.me/accshack" target="_blank" rel="noreferrer" className={styles.modalLink}>
              https://t.me/accshack
            </a>
            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={() => setShowContactModal(false)}>
                {dict.checkout.pendingDismiss}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
