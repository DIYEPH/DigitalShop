"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/CartProvider";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import { cancelPendingOrder, getActivePendingOrder } from "@/lib/api/orders";
import type { Locale } from "@/lib/i18n/config";
import type { Product, ProductPlan, ProductVariant, VolumeTier } from "@/types/product";
import { MIN_QUANTITY, PROMO_BPS_DENOMINATOR } from "./product-detail.constants";
import type { ActiveVolumeTier, AltCurrencyInfo, ProductDetailViewModel } from "./product-detail.types";

function applyDiscount(price: number, bps: number, currency: string): number {
  const next = price * (1 - bps / PROMO_BPS_DENOMINATOR);
  return Math.max(0, Math.round(next * 100) / 100);
}

function pickVolumeTier(tiers: VolumeTier[] | undefined, quantity: number): VolumeTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0 || !Number.isFinite(quantity) || quantity <= 0) return null;
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

export function useProductDetail(product: Product, lang: Locale): ProductDetailViewModel {
  const cart = useCart();
  const router = useRouter();
  const { token, hydrated } = useAuthToken();

  const variants = useMemo<ProductVariant[]>(
    () => (Array.isArray(product.variants) ? product.variants : []),
    [product.variants],
  );
  const plans = useMemo<ProductPlan[]>(
    () => (Array.isArray(product.plans) ? product.plans : []),
    [product.plans],
  );

  const [planId, setPlanId] = useState<number | null>(() => plans[0]?.id ?? null);

  const scopedVariants = useMemo(() => {
    if (!planId) return variants;
    const byPlan = variants.filter((v) => v.plan_id === planId);
    return byPlan.length > 0 ? byPlan : variants;
  }, [variants, planId]);

  const [variantId, setVariantId] = useState<number | null>(scopedVariants[0]?.id ?? null);
  const selectedVariantId = variantId && scopedVariants.some((v) => v.id === variantId)
    ? variantId
    : (scopedVariants[0]?.id ?? null);
  const selected = scopedVariants.find((v) => v.id === selectedVariantId) ?? null;

  const [quantity, setQuantity] = useState<number>(MIN_QUANTITY);
  const [pending, setPending] = useState<{
    orderId: string;
    expiresAt: string;
    sameProduct: boolean;
  } | null>(null);
  const pendingRequestKey = hydrated && token ? `${lang}:${product.id}:${token}` : "";
  const [pendingLoadedKey, setPendingLoadedKey] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCancelLoading, setPendingCancelLoading] = useState(false);

  const price = selected?.prices?.[product.currency] ?? product.price;
  const maxQuantity = useMemo(() => {
    if (!selected) return undefined;
    if (selected.fulfillment_type === "IN_STOCK") {
      return Math.max(0, selected.available_stock_count ?? 0);
    }
    if (typeof selected.preorder_remaining === "number") {
      return Math.max(0, selected.preorder_remaining);
    }
    return undefined;
  }, [selected]);

  const setClampedQuantity = (next: number) => {
    const min = MIN_QUANTITY;
    const max = maxQuantity;
    setQuantity(Math.min(max ?? next, Math.max(min, next)));
  };

  const clampedQuantity = Math.min(maxQuantity ?? quantity, Math.max(MIN_QUANTITY, quantity));

  const altSelected: AltCurrencyInfo = null;

  const promoBps = selected?.promo_percent_bps ?? null;
  const hasPromoPct = typeof promoBps === "number" && Number.isFinite(promoBps) && promoBps > 0;

  const discountedPrice = useMemo(() => {
    if (!hasPromoPct || promoBps === null) return price;
    return applyDiscount(price, promoBps, product.currency);
  }, [hasPromoPct, promoBps, price, product.currency]);

  const volumeTiers = useMemo<VolumeTier[]>(
    () =>
      Array.isArray(selected?.volume_tiers)
        ? [...(selected!.volume_tiers as VolumeTier[])].sort(
            (a, b) => Number(a.min_quantity) - Number(b.min_quantity),
          )
        : [],
    [selected],
  );

  const activeVolumeTier = useMemo<ActiveVolumeTier | null>(() => {
    const tier = pickVolumeTier(volumeTiers, clampedQuantity);
    if (!tier) return null;
    return {
      ...tier,
      unit_price: applyDiscount(discountedPrice, Number(tier.discount_bps), product.currency),
    };
  }, [volumeTiers, clampedQuantity, discountedPrice, product.currency]);

  const effectiveUnitPrice = activeVolumeTier ? activeVolumeTier.unit_price : discountedPrice;

  const buyNow = () => {
    if (!selected) return;
    if (maxQuantity !== undefined && maxQuantity < MIN_QUANTITY) return;
    cart.clear();
    cart.addItem(
      {
        lineId: `${product.id}:${selected.id}`,
        productId: product.id,
        name: product.name,
        variantId: selected.id,
        variantName: selected.name,
        promoPercentBps: selected.promo_percent_bps ?? null,
        price: discountedPrice,
        compare_at_price: hasPromoPct ? price : null,
        currency: product.currency,
        prices: { ...(selected.prices ?? product.prices), [product.currency]: discountedPrice },
        payment_methods: product.payment_methods,
        max_quantity: maxQuantity ?? null,
        image_url: product.image_url,
        volume_tiers: volumeTiers.length > 0 ? volumeTiers : null,
      },
      clampedQuantity,
    );
    router.push(`/${lang}/checkout`);
  };

  const refreshPending = async () => {
    if (!token) {
      setPending(null);
      setPendingLoadedKey("");
      return;
    }
    setPendingLoading(true);
    try {
      const active = await getActivePendingOrder({ token, lang });
      if (!active) {
        setPending(null);
        return;
      }
      const sameProduct = (active.items || []).some((it) => it.product_id === product.id);
      setPending({
        orderId: active.id,
        expiresAt: active.expires_at,
        sameProduct,
      });
    } finally {
      setPendingLoadedKey(pendingRequestKey);
      setPendingLoading(false);
    }
  };

  const cancelPending = async () => {
    if (!token || !pending) return;
    setPendingCancelLoading(true);
    try {
      await cancelPendingOrder({ token, lang, id: pending.orderId });
      setPending(null);
    } finally {
      setPendingCancelLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    getActivePendingOrder({ token, lang })
      .then((active) => {
        if (cancelled) return;
        if (!active) {
          setPending(null);
          return;
        }
        const sameProduct = (active.items || []).some((it) => it.product_id === product.id);
        setPending({
          orderId: active.id,
          expiresAt: active.expires_at,
          sameProduct,
        });
      })
      .finally(() => {
        if (!cancelled) setPendingLoadedKey(pendingRequestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, lang, product.id, pendingRequestKey]);

  return {
    variants,
    plans,
    scopedVariants,
    selected,
    planId,
    setPlanId,
    variantId: selectedVariantId,
    setVariantId,
    quantity: clampedQuantity,
    setQuantity: setClampedQuantity,
    maxQuantity,
    price,
    discountedPrice,
    effectiveUnitPrice,
    promoBps,
    hasPromoPct,
    altSelected,
    volumeTiers,
    activeVolumeTier,
    buyNow,
    pending: token && pending
      ? {
          orderId: pending.orderId,
          expiresAt: pending.expiresAt,
          sameProduct: pending.sameProduct,
          loading: pendingLoading || (Boolean(pendingRequestKey) && pendingLoadedKey !== pendingRequestKey),
          cancelLoading: pendingCancelLoading,
          refresh: refreshPending,
          cancel: cancelPending,
        }
      : null,
  };
}
