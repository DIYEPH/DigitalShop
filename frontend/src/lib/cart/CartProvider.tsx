"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItem, CartState } from "./types";
import type { Currency } from "../../types/order";

const STORAGE_KEY = "digitalshop.cart.v1";

interface CartContextValue extends CartState {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updatePrices: (currency: Currency, prices: Array<{ variantId: number; unitPrice: number }>) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 1) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStoredCartItems);
  const hydrated = true;

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const maxQuantity = item.max_quantity ?? undefined;
      const safeQuantity = Math.min(maxQuantity ?? quantity, Math.max(1, quantity));
      const existing = prev.find((i) => i.lineId === item.lineId);
      if (existing) {
        const nextQuantity = existing.quantity + quantity;
        return [{
          ...existing,
          ...item,
          quantity: Math.min(maxQuantity ?? nextQuantity, Math.max(1, nextQuantity)),
        }];
      }
      // Single-product checkout: adding a new product replaces cart content.
      return [{ ...item, quantity: safeQuantity }];
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.lineId !== lineId)
        : prev.map((i) => {
            if (i.lineId !== lineId) return i;
            const maxQuantity = i.max_quantity ?? undefined;
            return { ...i, quantity: Math.min(maxQuantity ?? quantity, Math.max(1, quantity)) };
          }),
    );
  }, []);

  const updatePrices = useCallback((currency: Currency, prices: Array<{ variantId: number; unitPrice: number }>) => {
    if (prices.length === 0) return;
    const priceByVariant = new Map(prices.map((p) => [p.variantId, p.unitPrice]));
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const unitPrice = priceByVariant.get(item.variantId);
        if (unitPrice === undefined || unitPrice <= 0) return item;
        if (item.price === unitPrice && item.prices?.[currency] === unitPrice) return item;
        changed = true;
        return {
          ...item,
          price: item.currency === currency ? unitPrice : item.price,
          prices: { ...item.prices, [currency]: unitPrice },
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem, removeItem, updateQuantity, updatePrices, clear,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: items.reduce((acc, i) => acc + i.price * i.quantity, 0),
    hydrated,
  }), [items, addItem, removeItem, updateQuantity, updatePrices, clear, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider />");
  return ctx;
}
