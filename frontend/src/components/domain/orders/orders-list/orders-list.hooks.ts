"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import { getMyOrders } from "@/lib/api/my-orders";
import type { Locale } from "@/lib/i18n/config";
import { ORDERS_DEFAULT_LIMIT } from "./orders-list.constants";
import type { OrderRow, OrdersListState } from "./orders-list.types";

export function useOrdersList(
  lang: Locale,
  messages: { loadOrdersFailed: string },
): OrdersListState & { token: string | null; hydrated: boolean } {
  const { token, hydrated } = useAuthToken();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const requestKey = hydrated && token ? `${lang}:${token}` : "";
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    getMyOrders({ token, lang, page: 1, limit: ORDERS_DEFAULT_LIMIT })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders as OrderRow[]);
        setError("");
        setLoadedKey(requestKey);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : messages.loadOrdersFailed);
        setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [token, hydrated, lang, messages.loadOrdersFailed, requestKey]);

  const loading = Boolean(requestKey) && loadedKey !== requestKey;
  const empty = useMemo(() => !loading && !error && orders.length === 0, [loading, error, orders.length]);

  return { token, hydrated, orders, loading, error, empty };
}
