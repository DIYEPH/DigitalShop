import { useEffect, useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n/types";
import type { UseCheckoutReturn } from "@/lib/cart/use-checkout";
import type { PaymentMethod } from "@/types/order";
import { PAYMENT_ICON_FALLBACK, PAYMENT_ICON_SRC, PENDING_TIMER_INTERVAL_MS } from "./payment-section.constants";

function getPaymentMeta(method: PaymentMethod, dict: Dictionary) {
  if (method === "BINANCE") {
    return {
      iconSrc: PAYMENT_ICON_SRC.BINANCE,
      iconFallback: PAYMENT_ICON_FALLBACK.BINANCE,
      desc: dict.checkout.paymentBinanceDesc,
      badge: dict.checkout.paymentRecommended,
    };
  }
  if (method === "USDT") {
    return {
      iconSrc: PAYMENT_ICON_SRC.USDT,
      iconFallback: PAYMENT_ICON_FALLBACK.USDT,
      desc: dict.checkout.paymentUsdtDesc,
      badge: "",
    };
  }
  return {
    iconSrc: PAYMENT_ICON_SRC.BALANCE,
    iconFallback: PAYMENT_ICON_FALLBACK.BALANCE,
    desc: dict.checkout.paymentBalanceDesc,
    badge: "",
  };
}

export function usePaymentSection(c: UseCheckoutReturn, dict: Dictionary) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!c.pendingOrder) return;
    const t = window.setInterval(() => setNow(Date.now()), PENDING_TIMER_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [c.pendingOrder]);

  const pendingSecondsLeft = useMemo(() => {
    if (!c.pendingOrder) return 0;
    const expiresAt = new Date(c.pendingOrder.expires_at).getTime();
    const referenceNow = now || expiresAt - c.pendingOrder.seconds_left * 1000;
    return Math.max(0, Math.floor((expiresAt - referenceNow) / 1000));
  }, [c.pendingOrder, now]);

  const mm = String(Math.floor(pendingSecondsLeft / 60)).padStart(2, "0");
  const ss = String(pendingSecondsLeft % 60).padStart(2, "0");

  return {
    mm,
    ss,
    getPaymentMeta: (method: PaymentMethod) => getPaymentMeta(method, dict),
  };
}

