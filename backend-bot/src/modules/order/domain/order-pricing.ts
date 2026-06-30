import { ApiException } from '../../../shared/errors/api.exception';

const MAX_DISCOUNT_BPS = 9000;
const BPS_DENOMINATOR = 10000;

export const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;
export const TIMED_PENDING_METHODS = new Set(['BINANCE', 'CRYPTO', 'BANK']);
export const VND_ONLY_PAYMENT_METHODS = new Set(['BANK', 'BALANCE_VND']);

/** Đếm redemption coupon — đơn đã hủy (CANCELLED) không chiếm slot (feature 13). */
export const COUPON_REDEMPTION_STATUSES = ['PENDING', 'PAID', 'DELIVERED'] as const;

export interface VolumeTierRow {
  minQuantity: number;
  discountBps: number;
  isActive: boolean;
}

export interface CouponRow {
  id: number;
  code: string;
  variantId: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  visibility: string;
  requiresOwnership: boolean;
  discountType: string;
  percentBps: number | null;
  amountUsdt: number | null;
  amountVnd: number | null;
  maxRedemptions: number | null;
  perUserLimit: number | null;
  costPoint?: number;
}

export interface ResolvedOrderCoupon {
  coupon: CouponRow;
  userCouponId: number | null;
}

export interface LinePricingInput {
  variantId: number;
  amountUsdt: number;
  amountVnd: number;
  quantity: number;
  tiers: VolumeTierRow[];
  coupon: CouponRow | null;
  /** true khi coupon đã qua resolveOrderCoupon — bỏ assert trùng */
  couponPrevalidated?: boolean;
  now?: Date;
}

export interface LinePricingResult {
  unitUsdt: number;
  unitVnd: number;
  subtotalUsdt: number;
  subtotalVnd: number;
  discountUsdt: number;
  discountVnd: number;
  totalUsdt: number;
  totalVnd: number;
  volumeTierApplied: { minQuantity: number; discountBps: number } | null;
  couponApplied: string | null;
}

export function pickBestVolumeTier(
  tiers: VolumeTierRow[],
  quantity: number,
): { minQuantity: number; discountBps: number } | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  let best: { minQuantity: number; discountBps: number } | null = null;
  for (const tier of tiers) {
    if (!tier.isActive) continue;
    if (quantity < tier.minQuantity) continue;
    const discountBps = Math.min(MAX_DISCOUNT_BPS, tier.discountBps);
    if (!best || tier.minQuantity > best.minQuantity) {
      best = { minQuantity: tier.minQuantity, discountBps };
    }
  }
  return best;
}

export function applyVolumeDiscount(unitPrice: number, tier: { discountBps: number } | null): number {
  if (!tier?.discountBps) return unitPrice;
  const next = unitPrice * (1 - tier.discountBps / BPS_DENOMINATOR);
  return Math.max(0, next);
}

export function roundUsdt(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundVnd(value: number): number {
  return Math.round(value);
}

export function computeLinePricing(input: LinePricingInput): LinePricingResult {
  const quantity = Number(input.quantity);
  const tier = pickBestVolumeTier(input.tiers, quantity);
  const unitUsdt = roundUsdt(applyVolumeDiscount(input.amountUsdt, tier));
  const unitVnd = roundVnd(applyVolumeDiscount(input.amountVnd, tier));
  const subtotalUsdt = roundUsdt(unitUsdt * quantity);
  const subtotalVnd = roundVnd(unitVnd * quantity);

  const couponResult = !input.coupon
    ? { discountUsdt: 0, discountVnd: 0, couponCode: null as string | null }
    : input.couponPrevalidated
      ? {
          ...applyCouponDiscount(input.coupon, subtotalUsdt, subtotalVnd),
          couponCode: input.coupon.code,
        }
      : resolveCouponDiscounts(
          input.coupon,
          input.variantId,
          subtotalUsdt,
          subtotalVnd,
          input.now ?? new Date(),
        );

  const discountUsdt = roundUsdt(couponResult.discountUsdt);
  const discountVnd = roundVnd(couponResult.discountVnd);

  return {
    unitUsdt,
    unitVnd,
    subtotalUsdt,
    subtotalVnd,
    discountUsdt,
    discountVnd,
    totalUsdt: roundUsdt(Math.max(0, subtotalUsdt - discountUsdt)),
    totalVnd: roundVnd(Math.max(0, subtotalVnd - discountVnd)),
    volumeTierApplied: tier
      ? { minQuantity: tier.minQuantity, discountBps: tier.discountBps }
      : null,
    couponApplied: couponResult.couponCode,
  };
}

export function currencyForPaymentMethod(paymentMethod: string): 'USDT' | 'VND' {
  return VND_ONLY_PAYMENT_METHODS.has(paymentMethod) ? 'VND' : 'USDT';
}

export function totalPriceForPaymentMethod(
  pricing: LinePricingResult,
  paymentMethod: string,
): number {
  return currencyForPaymentMethod(paymentMethod) === 'VND' ? pricing.totalVnd : pricing.totalUsdt;
}

export function unitPriceForPaymentMethod(
  pricing: LinePricingResult,
  paymentMethod: string,
): number {
  return currencyForPaymentMethod(paymentMethod) === 'VND' ? pricing.unitVnd : pricing.unitUsdt;
}

export function assertPaymentMethodAllowed(
  paymentMethod: string,
  allowedMethods: string[],
): void {
  if (!allowedMethods.includes(paymentMethod)) {
    throw new ApiException(
      'payment_method_invalid',
      'Payment method is not allowed for this variant.',
      400,
    );
  }
}

function assertCouponActive(coupon: CouponRow, now: Date): void {
  if (!coupon.isActive) {
    throw new ApiException('coupon_invalid', 'Invalid coupon code.', 400);
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new ApiException('coupon_invalid', 'Coupon is not active yet.', 400);
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    throw new ApiException('coupon_invalid', 'Coupon has expired.', 400);
  }
}

export function assertCouponBase(coupon: CouponRow, variantId: number, now: Date): void {
  assertCouponActive(coupon, now);
  if (coupon.variantId !== variantId) {
    throw new ApiException('coupon_invalid', 'Coupon does not apply to this variant.', 400);
  }
}

export function assertCouponDiscountType(coupon: CouponRow): void {
  if (coupon.discountType === 'PERCENT') {
    if (coupon.percentBps == null) {
      throw new ApiException('coupon_invalid', 'Coupon type is not supported for this quote.', 400);
    }
    return;
  }
  if (coupon.discountType === 'FIXED') {
    if (coupon.amountUsdt == null || coupon.amountVnd == null) {
      throw new ApiException('coupon_invalid', 'Coupon type is not supported for this quote.', 400);
    }
    return;
  }
  throw new ApiException('coupon_invalid', 'Coupon type is not supported for this quote.', 400);
}

/** PUBLIC hoặc Promo PRIVATE (không ownership). Voucher kiểm tra qua user_coupons. */
export function assertCouponCodeAccess(coupon: CouponRow): void {
  if (coupon.requiresOwnership) {
    throw new ApiException('coupon_not_owned', 'You do not own this coupon.', 400);
  }
  if (coupon.visibility !== 'PUBLIC' && coupon.visibility !== 'PRIVATE') {
    throw new ApiException('coupon_invalid', 'Invalid coupon code.', 400);
  }
}

/** @deprecated Dùng resolveOrderCoupon + couponPrevalidated */
export function assertCouponEligible(coupon: CouponRow, variantId: number, now: Date): void {
  assertCouponBase(coupon, variantId, now);
  assertCouponCodeAccess(coupon);
  assertCouponDiscountType(coupon);
}

export function applyPercentCouponDiscount(
  coupon: CouponRow,
  subtotalUsdt: number,
  subtotalVnd: number,
): { discountUsdt: number; discountVnd: number } {
  const bps = Number(coupon.percentBps);
  return {
    discountUsdt: Math.min(subtotalUsdt, (subtotalUsdt * bps) / 10000),
    discountVnd: Math.min(subtotalVnd, (subtotalVnd * bps) / 10000),
  };
}

export function applyFixedCouponDiscount(
  coupon: CouponRow,
  subtotalUsdt: number,
  subtotalVnd: number,
): { discountUsdt: number; discountVnd: number } {
  return {
    discountUsdt: Math.min(subtotalUsdt, Number(coupon.amountUsdt)),
    discountVnd: Math.min(subtotalVnd, Number(coupon.amountVnd)),
  };
}

export function applyCouponDiscount(
  coupon: CouponRow,
  subtotalUsdt: number,
  subtotalVnd: number,
): { discountUsdt: number; discountVnd: number } {
  assertCouponDiscountType(coupon);
  if (coupon.discountType === 'FIXED') {
    return applyFixedCouponDiscount(coupon, subtotalUsdt, subtotalVnd);
  }
  return applyPercentCouponDiscount(coupon, subtotalUsdt, subtotalVnd);
}

export function resolveCouponDiscounts(
  coupon: CouponRow | null,
  variantId: number,
  subtotalUsdt: number,
  subtotalVnd: number,
  now: Date,
): { discountUsdt: number; discountVnd: number; couponCode: string | null } {
  if (!coupon) {
    return { discountUsdt: 0, discountVnd: 0, couponCode: null };
  }

  assertCouponEligible(coupon, variantId, now);

  return {
    ...applyCouponDiscount(coupon, subtotalUsdt, subtotalVnd),
    couponCode: coupon.code,
  };
}

export function buildOrderExpiry(createdAt: Date, paymentMethod: string): {
  expiresAt: string | null;
  secondsLeft: number | null;
} {
  if (!TIMED_PENDING_METHODS.has(paymentMethod)) {
    return { expiresAt: null, secondsLeft: null };
  }
  const expiresMs = createdAt.getTime() + PENDING_PAYMENT_TIMEOUT_MS;
  const expiresAt = new Date(expiresMs);
  const secondsLeft = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
  return { expiresAt: expiresAt.toISOString(), secondsLeft };
}
