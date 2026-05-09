"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, QuantityStepper } from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { AddToCartButton } from "../add-to-cart-button";
import { useProductDetail } from "./product-detail.hooks";
import { PromoCountdown } from "./promo-countdown";
import { PlanPicker } from "./plan-picker";
import { VariantPicker } from "./variant-picker";
import { VolumeTierList } from "./volume-tier-list/volume-tier-list";
import type { ProductDetailProps } from "./product-detail.types";
import styles from "./product-detail.module.scss";

function getFulfillmentLabel(type: string | undefined, dict: ProductDetailProps["dict"]): string {
  const isPreorder = type === "PREORDER";
  return isPreorder ? dict.store.fulfillmentPreorder : dict.store.fulfillmentInstant;
}

function formatWarrantyDuration(value: number | null | undefined, unit: string | null | undefined, lang: "vi" | "en") {
  if (!value || !unit) return "";
  const unitLabels: Record<string, { vi: string; en: string }> = {
    HOUR: { vi: "giờ", en: value === 1 ? "hour" : "hours" },
    DAY: { vi: "ngày", en: value === 1 ? "day" : "days" },
    MONTH: { vi: "tháng", en: value === 1 ? "month" : "months" },
    YEAR: { vi: "năm", en: value === 1 ? "year" : "years" },
  };
  const label = unitLabels[unit]?.[lang] ?? unit.toLowerCase();
  return `${value} ${label}`;
}

function WarrantyNotice({
  selected,
  lang: _lang,
  dict,
}: {
  selected: ReturnType<typeof useProductDetail>["selected"];
  lang: "vi" | "en";
  dict: ProductDetailProps["dict"];
}) {
  if (!selected) return null;
  const type = selected.warranty_type ?? "NONE";
  const duration = formatWarrantyDuration(selected.warranty_value, selected.warranty_unit, _lang);

  let description: string;
  if (type === "LOGIN") {
    description = dict.store.warrantyLoginDesc;
  } else if (type === "CUSTOM") {
    description = duration
      ? dict.store.warrantyCustomWithDuration.replace("{duration}", duration)
      : dict.store.warrantyCustomPolicy;
  } else {
    description = dict.store.warrantyNone;
  }

  return (
    <div className={styles.panelNeutral}>
      <div className={styles.panelTitle}>{dict.store.warrantyTitle}</div>
      <div className={styles.panelBody}>{description}</div>
    </div>
  );
}

function FulfillmentNotice({
  selected,
  dict,
}: {
  selected: ReturnType<typeof useProductDetail>["selected"];
  dict: ProductDetailProps["dict"];
}) {
  if (!selected) return null;
  const isPreorder = selected.fulfillment_type === "PREORDER";
  if (!isPreorder) {
    const count = selected.available_stock_count ?? 0;
    return (
      <div className={styles.panelSuccess}>
        <div className={styles.panelSuccessTitle}>{getFulfillmentLabel(selected.fulfillment_type, dict)}</div>
        <div className={styles.panelBody}>{dict.store.inStockRemaining.replace("{count}", String(count))}</div>
      </div>
    );
  }

  const hours = selected.preorder_delivery_hours;
  const remaining = selected.preorder_remaining;
  return (
    <div className={styles.panelWarning}>
      <div className={styles.panelWarningTitle}>{getFulfillmentLabel(selected.fulfillment_type, dict)}</div>
      <div className={styles.preorderLines}>
        <p>
          {hours
            ? dict.store.preorderDeliverWithinHours.replace("{hours}", String(hours))
            : dict.store.preorderManualDelivery}
        </p>
        <p>
          {remaining === null || remaining === undefined
            ? dict.store.preorderUnlimited
            : dict.store.preorderRemaining.replace("{count}", String(remaining))}
        </p>
      </div>
    </div>
  );
}

export function ProductDetail({ lang, dict, product }: ProductDetailProps) {
  const vm = useProductDetail(product, lang);
  const [now, setNow] = useState(0);
  const {
    plans,
    scopedVariants,
    selected,
    planId,
    setPlanId,
    variantId,
    setVariantId,
    quantity,
    setQuantity,
    maxQuantity,
    price,
    discountedPrice,
    effectiveUnitPrice,
    hasPromoPct,
    altSelected,
    volumeTiers,
    activeVolumeTier,
    buyNow,
    pending,
  } = vm;
  const cannotPurchase = maxQuantity !== undefined && maxQuantity < 1;

  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [pending]);

  return (
    <>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href={`/${lang}`} className={styles.navLink}>
          {dict.nav.home}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/${lang}/products`} className={styles.navLink}>
          {dict.nav.store}
        </Link>
        <span aria-hidden>/</span>
        <span className={styles.breadcrumbCurrent}>{product.name}</span>
      </nav>
      <Link href={`/${lang}/products`} className="store-lang w-fit">
        ← {dict.store.backToStore}
      </Link>

      {pending ? (
        <div className={styles.pendingBanner}>
          <div className={styles.pendingTop}>
            <div className={styles.pendingText}>
              {dict.store.pendingOrderNotice
                .replace("{id}", String(pending.orderId))
                .replace("{suffix}", pending.sameProduct ? dict.store.pendingForThisProduct : "")}
            </div>
            <div className={styles.pendingClock}>
              {(() => {
                if (!now) return "--:--";
                const left = Math.max(0, Math.floor((new Date(pending.expiresAt).getTime() - now) / 1000));
                const mm = String(Math.floor(left / 60)).padStart(2, "0");
                const ss = String(left % 60).padStart(2, "0");
                return `${mm}:${ss}`;
              })()}
            </div>
          </div>
          <div className={styles.pendingActions}>
            <Button href={`/${lang}/payment/${pending.orderId}`} variant="primary">
              {dict.checkout.pendingContinue}
            </Button>
            <Button type="button" variant="outline" disabled={pending.cancelLoading} onClick={() => void pending.cancel()}>
              {pending.cancelLoading ? dict.checkout.pendingCancelling : dict.checkout.pendingCancel}
            </Button>
          </div>
        </div>
      ) : null}

      <article className={styles.article}>
        <section className="store-card sm:p-inset-medium lg:overflow-hidden">
          <div className={styles.mediaInner}>
            <div className={styles.imageFrame}>
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  unoptimized
                  className={styles.imageCover}
                  sizes="(max-width: 1024px) 90vw, 14rem"
                />
              ) : null}
            </div>

            <div className={styles.infoColumn}>
              <h1 className={styles.productTitle}>{product.name}</h1>

              <div className={styles.noticesGrid}>
                <FulfillmentNotice selected={selected} dict={dict} />
                <WarrantyNotice selected={selected} lang={lang} dict={dict} />
              </div>

              {product.description ? (
                <div className={styles.description} dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : null}
            </div>
          </div>
        </section>

        <aside className={cn("store-card sm:p-inset-relaxed lg:overflow-y-auto", styles.asideColumn)}>
          <PromoCountdown endsAt={selected?.promo_ends_at} limitedLabel={dict.store.limitedTime} />

          {plans.length > 0 ? (
            <PlanPicker plans={plans} selectedId={planId} onSelect={setPlanId} label={dict.store.planLabel} />
          ) : null}

          <VariantPicker
            variants={scopedVariants}
            selectedId={variantId ?? selected?.id ?? null}
            onSelect={setVariantId}
            currency={product.currency}
            fallbackPrice={price}
            lang={lang}
            label={dict.store.subscriptionDurationLabel}
          />

          <div className={styles.priceBlock}>
            <div className={styles.priceRow}>
              <div className={styles.priceMain}>{formatPrice(effectiveUnitPrice, product.currency, lang)}</div>
              {(hasPromoPct || activeVolumeTier) && effectiveUnitPrice < price ? (
                <div className={styles.priceStrike}>{formatPrice(price, product.currency, lang)}</div>
              ) : null}
            </div>
            {activeVolumeTier ? (
              <div className={styles.bulkHint}>
                {dict.store.bulkApplied
                  .replace("{percent}", (Number(activeVolumeTier.discount_bps) / 100).toFixed(0))
                  .replace("{count}", String(activeVolumeTier.min_quantity))}
              </div>
            ) : null}
            {altSelected ? (
              <div className={styles.altHint}>
                {dict.store.or} {formatPrice(altSelected.price, altSelected.currency, lang)}
              </div>
            ) : null}
          </div>

          {volumeTiers.length > 0 ? (
            <VolumeTierList
              tiers={volumeTiers}
              quantity={quantity}
              unitPrice={discountedPrice}
              currency={product.currency}
              lang={lang}
              dict={dict}
            />
          ) : null}

          <div className={styles.buyStack}>
            <div className={styles.qtyBar}>
              <div className={styles.qtyLabel}>{dict.cart.quantity}</div>
              <QuantityStepper
                value={quantity}
                onChange={(q: number) => setQuantity(q)}
                min={1}
                max={maxQuantity}
                decrementLabel={dict.cart.decreaseQty}
                incrementLabel={dict.cart.increaseQty}
              />
            </div>

            <Button type="button" variant="primary" className={cn(styles.buyCta)} onClick={buyNow} disabled={cannotPurchase}>
              <span aria-hidden>⚡</span> {dict.store.buyNow}
            </Button>
            <AddToCartButton
              lang={lang}
              dict={dict}
              product={{
                ...product,
                price: discountedPrice,
                prices: { ...(selected?.prices ?? product.prices), [product.currency]: discountedPrice },
              }}
              selected_variant_id={selected?.id ?? null}
              selected_variant_name={selected?.name ?? null}
              selected_variant_promo_bps={selected?.promo_percent_bps ?? null}
              compare_at_price={hasPromoPct ? price : null}
              selected_variant_volume_tiers={volumeTiers.length > 0 ? volumeTiers : null}
              quantity={quantity}
              maxQuantity={maxQuantity}
              variant="cart"
              disabled={cannotPurchase}
            />
          </div>
        </aside>
      </article>
    </>
  );
}
