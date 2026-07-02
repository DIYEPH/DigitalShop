import { ApiException } from '../../../../shared/errors/api.exception';
import { CouponRepository } from '../../../coupon/domain/repositories/coupon.repository';
import {
  COUPON_REDEMPTION_STATUSES,
  CouponRow,
  ResolvedOrderCoupon,
  assertCouponBase,
  assertCouponCodeAccess,
  assertCouponDiscountType,
} from '../../domain/order-pricing';
import { OrderRepository } from '../../domain/repositories/order.repository';

export interface ResolveOrderCouponInput {
  couponCode?: string;
  userCouponId?: number;
}

function assertCouponLimits(
  coupon: CouponRow,
  counts: { total: number; perUser: number },
): void {
  if (coupon.maxRedemptions != null && counts.total >= coupon.maxRedemptions) {
    throw new ApiException('coupon_limit_exceeded', 'Coupon redemption limit reached.', 400);
  }
  if (coupon.perUserLimit != null && counts.perUser >= coupon.perUserLimit) {
    throw new ApiException('coupon_limit_exceeded', 'Coupon per-user limit reached.', 400);
  }
}

async function assertCouponRedemptionLimits(
  couponRepository: CouponRepository,
  coupon: CouponRow,
  userId: number,
): Promise<void> {
  if (coupon.maxRedemptions == null && coupon.perUserLimit == null) return;
  const counts = await couponRepository.countCouponRedemptions(
    coupon.id,
    userId,
    COUPON_REDEMPTION_STATUSES,
  );
  assertCouponLimits(coupon, counts);
}

async function finalizeResolvedCoupon(
  couponRepository: CouponRepository,
  coupon: CouponRow,
  userId: number,
  userCouponId: number | null,
): Promise<ResolvedOrderCoupon> {
  assertCouponDiscountType(coupon);
  await assertCouponRedemptionLimits(couponRepository, coupon, userId);
  return { coupon, userCouponId };
}

export async function resolveOrderCoupon(
  orderRepository: OrderRepository,
  couponRepository: CouponRepository,
  shopId: string,
  input: ResolveOrderCouponInput,
  variantId: number,
  userId: number,
): Promise<ResolvedOrderCoupon | null> {
  const now = new Date();

  if (input.userCouponId != null) {
    const row = await couponRepository.findUserCouponById(
      shopId,
      Number(input.userCouponId),
      userId,
    );
    if (!row || row.usedAt) {
      throw new ApiException('coupon_not_owned', 'You do not own this coupon.', 400);
    }
    assertCouponBase(row.coupon, variantId, now);
    return finalizeResolvedCoupon(couponRepository, row.coupon, userId, row.userCouponId);
  }

  const code = input.couponCode?.trim();
  if (!code) return null;

  const coupon = await orderRepository.findCouponByCode(shopId, code);
  if (!coupon) {
    throw new ApiException('coupon_invalid', 'Invalid coupon code.', 400);
  }

  assertCouponBase(coupon, variantId, now);

  if (coupon.requiresOwnership) {
    const owned = await couponRepository.findUnusedUserCouponByCode(shopId, userId, code);
    if (!owned) {
      throw new ApiException('coupon_not_owned', 'You do not own this coupon.', 400);
    }
    return finalizeResolvedCoupon(couponRepository, coupon, userId, owned.userCouponId);
  }

  assertCouponCodeAccess(coupon);
  return finalizeResolvedCoupon(couponRepository, coupon, userId, null);
}
