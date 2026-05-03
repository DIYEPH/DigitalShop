"use client";

import { useCart } from "@/lib/cart/CartProvider";
import styles from "./cart-badge.module.scss";

export function CartBadge() {
  const { itemCount, hydrated } = useCart();
  if (!hydrated || itemCount === 0) return null;
  return (
    <span aria-label={`${itemCount} items in cart`} className={styles.badge}>
      {itemCount > 99 ? "99+" : itemCount}
    </span>
  );
}
