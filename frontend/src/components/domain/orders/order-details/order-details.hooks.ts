"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import {
  cancelOrderPending,
  getOrderDetails,
  getOrderPayment,
  type OrderDetails,
} from "@/lib/api/order-details";
import type { Locale } from "@/lib/i18n/config";
import type { PaymentInstruction } from "@/types/order";
import type { OrderDetailsState } from "./order-details.types";

const ORDER_STATUS_POLL_INTERVAL_MS = 10_000;

export function useOrderDetails(
  lang: Locale,
  id: string,
  messages: { loadOrderFailed: string; cancelOrderFailed: string },
  options: { includePayment?: boolean } = {},
): OrderDetailsState & {
  token: string | null;
  hydrated: boolean;
  title: string;
  cancelPendingLoading: boolean;
  cancelPending: () => Promise<void>;
} {
  const includePayment = options.includePayment ?? true;
  const { token, hydrated } = useAuthToken();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [payment, setPayment] = useState<PaymentInstruction | null>(null);
  const [error, setError] = useState("");
  const requestKey = hydrated && token && id ? `${lang}:${id}:${includePayment ? "payment" : "order"}:${token}` : "";
  const [loadedKey, setLoadedKey] = useState("");

  const [cancelPendingLoading, setCancelPendingLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !token || !id) return;
    let cancelled = false;
    const paymentRequest = includePayment
      ? getOrderPayment({ token, lang, id }).then((p) => p.payment)
      : Promise.resolve(null);
    Promise.all([getOrderDetails({ token, lang, id }), paymentRequest])
      .then(([o, p]) => {
        if (cancelled) return;
        setOrder(o);
        setPayment(p);
        setError("");
        setLoadedKey(requestKey);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : messages.loadOrderFailed);
        setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [token, hydrated, lang, id, includePayment, messages.loadOrderFailed, requestKey]);

  const isPendingTimedPayment = includePayment
    && order?.status === "PENDING"
    && (order?.payment_method === "BINANCE" || order?.payment_method === "USDT");

  useEffect(() => {
    if (!isPendingTimedPayment || !token || !order) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await getOrderDetails({ token, lang, id: order.id });
        if (cancelled) return;
        setOrder(fresh);
      } catch {
        // keep silent; next interval will retry
      }
    }, ORDER_STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isPendingTimedPayment, token, lang, order]);

  const title = useMemo(() => {
    if (!order) return "";
    const first = order.items?.[0];
    if (!first) return "";

    return first.snapshot_variant_name || "";
  }, [order]);

  const cancelPending = useCallback(async () => {
    if (!token || !order || order.status !== "PENDING") return;
    setCancelPendingLoading(true);
    setError("");
    try {
      await cancelOrderPending({ token, lang, id: order.id });
      const fresh = await getOrderDetails({ token, lang, id: order.id });
      setOrder(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : messages.cancelOrderFailed);
    } finally {
      setCancelPendingLoading(false);
    }
  }, [token, order, lang, messages.cancelOrderFailed]);

  return {
    token,
    hydrated,
    order,
    payment,
    loading: Boolean(requestKey) && loadedKey !== requestKey,
    error,
    cancelPendingLoading,
    cancelPending,
    title,
  };
}
