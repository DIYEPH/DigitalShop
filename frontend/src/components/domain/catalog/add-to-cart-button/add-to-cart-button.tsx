"use client";

import { useCart } from "@/lib/cart/CartProvider";
import { Button } from "@/components/ui";
import { routePath } from "@/lib/i18n/routes";
import { useAddedPulse } from "./add-to-cart-button.hooks";
import type { AddToCartButtonProps } from "./add-to-cart-button.types";

export function AddToCartButton({
  lang,
  dict,
  product,
  selected_variant_id = null,
  selected_variant_name = null,
  selected_variant_promo_bps = null,
  compare_at_price = null,
  selected_variant_volume_tiers = null,
  quantity = 1,
  maxQuantity,
  variant = "buy",
  disabled = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const { added, pulse } = useAddedPulse();

  if (variant === "buy") {
    return (
      <Button href={routePath(lang, "product", product.slug)} variant="primary" size="lg" className="w-full justify-center">
        {dict.store.buyNow}
      </Button>
    );
  }

  const handleClick = () => {
    if (disabled || !selected_variant_id || quantity <= 0) return;
    addItem({
      lineId: `${product.id}:${selected_variant_id}`,
      productId: product.id,
      name: product.name,
      variantId: selected_variant_id,
      variantName: selected_variant_name,
      promoPercentBps: selected_variant_promo_bps,
      price: product.price,
      compare_at_price,
      currency: product.currency,
      prices: product.prices,
      payment_methods: product.payment_methods,
      max_quantity: maxQuantity ?? null,
      image_url: product.image_url,
      volume_tiers: selected_variant_volume_tiers,
    }, quantity);
    pulse();
  };

  const label = dict.store.addToCart;

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      className="w-full justify-center"
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
    >
      {label}
    </Button>
  );
}
