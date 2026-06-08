import { currencyForPayment, paymentsForLang } from "../region/policy";
import type { Locale } from "../i18n/config";
import type { CartItem } from "./types";
import type { Currency, OrderQuote, PaymentMethod } from "../../types/order";
import type { VolumeTier } from "../../types/product";

const BPS_DENOMINATOR = 10_000;

function pickBestTier(tiers: VolumeTier[] | null | undefined, quantity: number): VolumeTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  let best: VolumeTier | null = null;
  for (const t of tiers) {
    const mq = Number(t?.min_quantity);
    const bps = Number(t?.discount_bps);
    if (!Number.isInteger(mq) || mq < 2 || !Number.isFinite(bps) || bps <= 0) continue;
    if (quantity < mq) continue;
    if (!best || mq > Number(best.min_quantity)) best = t;
  }
  return best;
}

function applyTierToPrice(unitPrice: number, tier: VolumeTier | null, currency: Currency): number {
  if (!tier) return unitPrice;
  const bps = Number(tier.discount_bps);
  if (!Number.isFinite(bps) || bps <= 0) return unitPrice;
  const next = Math.max(0, unitPrice * (1 - bps / BPS_DENOMINATOR));
  return Math.round(next * 100) / 100;
}

export function getAvailablePayments(lang: Locale, items: CartItem[]): PaymentMethod[] {
  const base = paymentsForLang(lang);
  const perItem = items
    .map((item) => item.payment_methods)
    .filter((methods): methods is PaymentMethod[] => Array.isArray(methods) && methods.length > 0);
  const shared = perItem.length === 0
    ? base
    : base.filter((method) => perItem.every((methods) => methods.includes(method)));
  return shared.filter((m) => m === "USDT" || m === "BINANCE" || m === "BALANCE");
}

export function getChargeCurrency({
  paymentMethod,
  balanceCurrency: _balanceCurrency,
  lang: _lang,
}: {
  paymentMethod: PaymentMethod;
  balanceCurrency: Currency;
  lang: Locale;
}): Currency {
  if (paymentMethod === "BALANCE") return "USDT";
  return currencyForPayment(paymentMethod);
}

export function toOrderItems(items: CartItem[]) {
  return items.map((item) => ({ variantId: item.variantId, quantity: item.quantity }));
}

export function getQuoteItemMap(quote: OrderQuote | null) {
  const rows = Array.isArray(quote?.items) ? quote.items : [];
  return new Map(rows.map((item) => [item.variant_id, item]));
}

export function getCartUnitPrice({
  item,
  currency,
  quote,
}: {
  item: CartItem;
  currency: Currency;
  quote: OrderQuote | null;
}) {
  const fromQuote = getQuoteItemMap(quote).get(item.variantId)?.unit_price;
  if (typeof fromQuote === "number" && Number.isFinite(fromQuote) && fromQuote > 0) return fromQuote;
  const base = item.prices?.[currency] ?? item.price;
  const tier = pickBestTier(item.volume_tiers, item.quantity);
  return applyTierToPrice(base, tier, currency);
}

export function getCartSubtotal(items: CartItem[], currency: Currency, quote: OrderQuote | null) {
  if (quote) return quote.total_price;
  return items.reduce((total, item) => total + getCartUnitPrice({ item, currency, quote }) * item.quantity, 0);
}

export function quoteToCartPrices(quote: OrderQuote) {
  return (quote.items ?? []).map((item) => ({
    variantId: item.variant_id,
    unitPrice: item.unit_price,
  }));
}

export function commonPaymentError(lang: Locale) {
  return lang === "vi"
    ? "Các sản phẩm trong giỏ không có phương thức thanh toán chung."
    : "Items in your cart do not share an available payment method.";
}
