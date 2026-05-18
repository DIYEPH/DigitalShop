export const PENDING_TIMER_INTERVAL_MS = 1000;

export const PAYMENT_ICON_SRC = {
  BINANCE: "/icons/payments/binance.svg",
  USDT: "/icons/payments/usdt.svg",
  BALANCE: "/icons/payments/wallet.svg",
} as const;

export const PAYMENT_ICON_FALLBACK = {
  BINANCE: "BN",
  USDT: "U",
  BALANCE: "B",
} as const;
