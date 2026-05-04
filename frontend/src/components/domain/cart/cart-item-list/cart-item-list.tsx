"use client";

import { useCart } from "@/lib/cart/CartProvider";
import { formatPrice } from "@/lib/utils/format";
import { ShoppingCart } from "lucide-react";
import { Button, QuantityStepper } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { VolumeTier } from "@/types/product";
import { cn } from "@/lib/utils/cn";
import styles from "./cart-item-list.module.scss";

interface Props {
  lang: Locale;
  dict: Dictionary;
}

const BPS_DENOMINATOR = 10_000;

function pickActiveTier(tiers: VolumeTier[] | null | undefined, quantity: number): VolumeTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  let best: VolumeTier | null = null;
  for (const t of tiers) {
    const mq = Number(t?.min_quantity);
    const bps = Number(t?.discount_bps);
    if (!Number.isInteger(mq) || mq < 2 || !Number.isFinite(bps) || bps <= 0) continue;
    if (quantity < mq) continue;
    if (!best || mq > Number(best.min_quantity)) best = { min_quantity: mq, discount_bps: bps };
  }
  return best;
}

function applyTier(unitPrice: number, bps: number, currency: string): number {
  const next = unitPrice * (1 - bps / BPS_DENOMINATOR);
  return Math.max(0, Math.round(next * 100) / 100);
}

export function CartItemList({ lang, dict }: Props) {
  const { items, updateQuantity, removeItem, subtotal, hydrated } = useCart();

  if (!hydrated) return <p className={styles.loading}>…</p>;

  if (items.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <div className={cn("store-card", styles.emptyCard)}>
          <div className={styles.emptyEmoji} aria-hidden>
            <ShoppingCart />
          </div>
          <h2 className={styles.emptyTitle}>{dict.cart.emptyTitle}</h2>
          <p className={styles.emptyDesc}>{dict.cart.empty}</p>
          <p className={styles.emptyHint}>{dict.cart.emptyHint}</p>
          <Button href={`/${lang}/products`} variant="primary" size="lg" className="w-full">
            {dict.cart.continueShopping}
          </Button>
        </div>
      </div>
    );
  }

  const currency = items[0]?.currency ?? "USDT";

  const enrichedItems = items.map((item) => {
    const tier = pickActiveTier(item.volume_tiers, item.quantity);
    const effectiveUnit = tier ? applyTier(item.price, Number(tier.discount_bps), item.currency) : item.price;
    return { item, tier, effectiveUnit };
  });
  const previewSubtotal = enrichedItems.reduce((s, x) => s + x.effectiveUnit * x.item.quantity, 0);

  return (
    <div className={styles.pageGrid}>
      <div className={styles.itemsColumn}>
        <h2 className={styles.countHeading}>
          {dict.cart.itemCount}: {items.length}
        </h2>

        <div className={styles.itemList}>
          {enrichedItems.map(({ item, tier, effectiveUnit }) => (
            <div key={item.lineId} className={cn("store-card", styles.itemCard)}>
              <div className={styles.itemHeader}>
                <div className={styles.itemMain}>
                  <h3 className={styles.itemTitle}>{item.name}</h3>
                  {item.variantName ? <p className={styles.variantLine}>{item.variantName}</p> : null}
                  <div className={styles.priceRow}>
                    <span className={styles.salePrice}>
                      {dict.cart.salePrice}: {formatPrice(effectiveUnit, item.currency, lang)}
                    </span>
                    {tier ? (
                      <span className={styles.tierBadge}>
                        -{(Number(tier.discount_bps) / 100).toFixed(0)}% · {dict.cart.tierFrom.replace("{count}", String(tier.min_quantity))}
                      </span>
                    ) : null}
                    {tier && effectiveUnit < item.price ? (
                      <span className={styles.strike}>{formatPrice(item.price, item.currency, lang)}</span>
                    ) : item.compare_at_price && item.compare_at_price > item.price ? (
                      <span className={styles.strike}>
                        {dict.cart.originalPrice}: {formatPrice(item.compare_at_price, item.currency, lang)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button type="button" variant="danger" size="sm" className="shrink-0" onClick={() => removeItem(item.lineId)}>
                  {dict.cart.remove}
                </Button>
              </div>

              <div className={styles.itemFooter}>
                <div className={styles.qtyGroup}>
                  <span className={styles.qtyCaption}>{dict.cart.quantity}:</span>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(q: number) => updateQuantity(item.lineId, q)}
                    min={1}
                    max={item.max_quantity ?? undefined}
                    decrementLabel={dict.cart.decreaseQty}
                    incrementLabel={dict.cart.increaseQty}
                  />
                </div>
                <p className={styles.lineTotal}>{formatPrice(effectiveUnit * item.quantity, item.currency, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.summarySticky}>
        <div className={cn("store-card", styles.summaryCard)}>
          <h2 className={styles.summaryTitle}>{dict.cart.orderSummary}</h2>

          <div className={styles.summaryLines}>
            <div className={styles.summaryLine}>
              <span className={styles.summaryLabel}>{dict.cart.subtotal}</span>
              <span className={styles.summaryValue}>{formatPrice(subtotal, currency, lang)}</span>
            </div>
            {previewSubtotal < subtotal ? (
              <div className={styles.summaryLine}>
                <span className={styles.discountLabel}>{dict.cart.bulkDiscount}</span>
                <span className={styles.discountValue}>-{formatPrice(subtotal - previewSubtotal, currency, lang)}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.totalBand}>
            <span className={styles.totalWord}>{dict.cart.total}</span>
            <span className={styles.totalAmt}>{formatPrice(previewSubtotal, currency, lang)}</span>
          </div>

          <div className={styles.actions}>
            <Button href={`/${lang}/checkout`} variant="primary" size="lg" className="w-full">
              {dict.cart.goToCheckout} →
            </Button>
            <Button href={`/${lang}/products`} variant="outline" size="lg" className="w-full">
              {dict.cart.continueShopping}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
