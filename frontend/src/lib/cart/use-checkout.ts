"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { cancelPendingOrder, createOrder, getActivePendingOrder, quoteOrder } from "../api/orders";
import { getAuthToken } from "../auth/token";
import type { Locale } from "../i18n/config";
import type { Currency, OrderQuote, PaymentMethod, PendingOrder } from "../../types/order";
import {
  commonPaymentError,
  getAvailablePayments,
  getCartSubtotal,
  getCartUnitPrice,
  getChargeCurrency,
  quoteToCartPrices,
  toOrderItems,
} from "./checkout.helpers";

/** Checkout state + submit. Keeps <CheckoutForm/> presentation-only. */
export function useCheckout(lang: Locale) {
  const router = useRouter();
  const cart = useCart();
  const availablePayments = useMemo(() => getAvailablePayments(lang, cart.items), [lang, cart.items]);

  const [paymentMethodValue, setPaymentMethodValue] = useState<PaymentMethod>(availablePayments[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "checking" | "applied" | "error">("idle");
  const [voucherMessage, setVoucherMessage] = useState<string>("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState(false);
  const lastQuoteKeyRef = useRef<string>("");

  const paymentMethod = availablePayments.includes(paymentMethodValue)
    ? paymentMethodValue
    : (availablePayments[0] ?? paymentMethodValue);

  const resetQuote = (opts?: { keepAppliedCoupon?: boolean }) => {
    setQuote(null);
    if (!opts?.keepAppliedCoupon) {
      setAppliedCouponCode(null);
    }
    lastQuoteKeyRef.current = "";
    if (!opts?.keepAppliedCoupon && voucherStatus === "applied") {
      setVoucherStatus("idle");
      setVoucherMessage("");
    }
  };

  const updatePaymentMethod = (value: PaymentMethod) => {
    setPaymentMethodValue(value);
    resetQuote({ keepAppliedCoupon: true });
  };

  const chargeCurrency: Currency = useMemo(
    () => getChargeCurrency({ paymentMethod, balanceCurrency: "USDT", lang }),
    [paymentMethod, lang],
  );
  const subtotal = useMemo(() => getCartSubtotal(cart.items, chargeCurrency, quote), [cart.items, chargeCurrency, quote]);
  const unitPrice = (item: (typeof cart.items)[number]) => getCartUnitPrice({ item, currency: chargeCurrency, quote });

  const updateVoucherCode = (value: string) => {
    setVoucherCode(value);
    resetQuote();
  };

  useEffect(() => {
    let cancelled = false;
    if (!cart.hydrated || cart.items.length === 0) return;
    if (availablePayments.length === 0 || !availablePayments.includes(paymentMethod)) return;
    const token = getAuthToken();
    if (!token) return;
    const itemsPayload = toOrderItems(cart.items);
    const requestKey = JSON.stringify({
      items: itemsPayload,
      payment_method: paymentMethod,
      currency: chargeCurrency,
      network: null,
      coupon_code: appliedCouponCode || null,
      lang,
    });
    if (lastQuoteKeyRef.current === requestKey) return;
    lastQuoteKeyRef.current = requestKey;
    quoteOrder({
      token,
      lang,
      items: itemsPayload,
      payment_method: paymentMethod,
      currency: chargeCurrency,
      network: undefined,
      coupon_code: appliedCouponCode || undefined,
    })
      .then((nextQuote) => {
        if (cancelled) return;
        setQuote(nextQuote);
        cart.updatePrices(nextQuote.currency, quoteToCartPrices(nextQuote));
      })
      .catch(() => {
        if (!cancelled && voucherStatus !== "applied") {
          setQuote(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cart, cart.hydrated, cart.items, cart.updatePrices, availablePayments, paymentMethod, chargeCurrency, appliedCouponCode, lang, voucherStatus]);

  const submit = async (loginRequiredMsg: string, fallbackErrorMsg: string) => {
    setError(null);
    if (availablePayments.length === 0 || !availablePayments.includes(paymentMethod)) {
      return setError(commonPaymentError(lang));
    }
    const token = getAuthToken();
    if (!token) return setError(loginRequiredMsg);

    setSubmitting(true);
    try {
      const pending = await getActivePendingOrder({ token, lang });
      if (pending) {
        setPendingOrder(pending);
        setError(null);
        return;
      }

      const response = await createOrder({
        items: toOrderItems(cart.items),
        payment_method: paymentMethod,
        currency: chargeCurrency,
        network: undefined,
        coupon_code: appliedCouponCode || undefined,
        token,
        lang,
      });
      cart.clear();
      router.push(`/${lang}/payment/${response.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackErrorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const dismissPending = () => setPendingOrder(null);

  const cancelPending = async (fallbackErrorMsg: string) => {
    if (!pendingOrder) return;
    const token = getAuthToken();
    if (!token) {
      setError(fallbackErrorMsg);
      return;
    }
    setPendingActionLoading(true);
    try {
      await cancelPendingOrder({ token, lang, id: pendingOrder.id });
      setPendingOrder(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackErrorMsg);
    } finally {
      setPendingActionLoading(false);
    }
  };

  const applyVoucher = async (messages: {
    loginRequiredMsg: string;
    enterCodeMsg: string;
    appliedMsg: string;
    invalidMsg: string;
  }) => {
    const code = voucherCode.trim();
    if (!code) {
      setVoucherStatus("error");
      setVoucherMessage(messages.enterCodeMsg);
      return;
    }
    setVoucherStatus("checking");
    setVoucherMessage("");
    setQuote(null);
    if (availablePayments.length === 0 || !availablePayments.includes(paymentMethod)) {
      setVoucherStatus("error");
      setVoucherMessage(commonPaymentError(lang));
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setVoucherStatus("error");
      setVoucherMessage(messages.loginRequiredMsg);
      return;
    }
    try {
      const nextQuote = await quoteOrder({
        token,
        lang,
        items: toOrderItems(cart.items),
        payment_method: paymentMethod,
        currency: chargeCurrency,
        network: undefined,
        coupon_code: code,
      });
      setQuote(nextQuote);
      cart.updatePrices(nextQuote.currency, quoteToCartPrices(nextQuote));
      setAppliedCouponCode(code);
      setVoucherStatus("applied");
      setVoucherMessage(messages.appliedMsg);
    } catch (e) {
      setAppliedCouponCode(null);
      setVoucherStatus("error");
      setVoucherMessage(e instanceof Error ? e.message : messages.invalidMsg);
    }
  };

  return {
    items: cart.items,
    hydrated: cart.hydrated,
    availablePayments,
    paymentMethod, setPaymentMethod: updatePaymentMethod,
    chargeCurrency,
    voucherCode, setVoucherCode: updateVoucherCode,
    voucherStatus, voucherMessage, applyVoucher,
    quote,
    pendingOrder, pendingActionLoading, dismissPending, cancelPending,
    submitting, error,
    subtotal, unitPrice, submit,
  };
}

export type UseCheckoutReturn = ReturnType<typeof useCheckout>;
