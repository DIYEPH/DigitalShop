import { COUPON_REDEMPTION_STATUSES } from '../../../order/domain/order-pricing';
import { CouponRepository } from '../../domain/repositories/coupon.repository';
import { UserCouponWalletRow } from '../../domain/entities/user-coupon-wallet-row.entity';

export interface CouponWalletItemDto {
  user_coupon_id: number;
  code: string;
  variant_id: number;
  product_name: string;
  variant_name: string;
  discount_type: string;
  discount_percent: number | null;
  discount_amount_usdt: number | null;
  discount_amount_vnd: number | null;
  cost_point: number;
  used_at: string | null;
  expires_at: string | null;
  can_use: boolean;
  cannot_use_reason: string | null;
}

function productName(row: UserCouponWalletRow, lang: 'vi' | 'en'): string {
  return lang === 'vi' ? row.productNameVi || row.productNameEn : row.productNameEn || row.productNameVi;
}

function variantName(row: UserCouponWalletRow, lang: 'vi' | 'en'): string {
  return lang === 'vi' ? row.variantNameVi || row.variantNameEn : row.variantNameEn || row.variantNameVi;
}

export async function mapCouponWalletItems(
  couponRepository: CouponRepository,
  rows: UserCouponWalletRow[],
  userId: number,
  options: { variantId?: number; lang?: 'vi' | 'en' },
): Promise<CouponWalletItemDto[]> {
  const lang = options.lang ?? 'en';
  const now = new Date();
  const items: CouponWalletItemDto[] = [];

  for (const row of rows) {
    const coupon = row.coupon;
    let canUse = row.usedAt == null;
    let cannotUseReason: string | null = null;

    if (canUse && !coupon.isActive) {
      canUse = false;
      cannotUseReason = 'inactive';
    }
    if (canUse && coupon.startsAt && now < coupon.startsAt) {
      canUse = false;
      cannotUseReason = 'not_started';
    }
    if (canUse && coupon.endsAt && now > coupon.endsAt) {
      canUse = false;
      cannotUseReason = 'expired';
    }
    if (canUse && options.variantId != null && coupon.variantId !== options.variantId) {
      canUse = false;
      cannotUseReason = 'wrong_variant';
    }
    if (canUse && (coupon.maxRedemptions != null || coupon.perUserLimit != null)) {
      const counts = await couponRepository.countCouponRedemptions(
        coupon.id,
        userId,
        COUPON_REDEMPTION_STATUSES,
      );
      if (coupon.maxRedemptions != null && counts.total >= coupon.maxRedemptions) {
        canUse = false;
        cannotUseReason = 'limit_exceeded';
      }
      if (canUse && coupon.perUserLimit != null && counts.perUser >= coupon.perUserLimit) {
        canUse = false;
        cannotUseReason = 'limit_exceeded';
      }
    }

    items.push({
      user_coupon_id: row.userCouponId,
      code: coupon.code,
      variant_id: coupon.variantId,
      product_name: productName(row, lang),
      variant_name: variantName(row, lang),
      discount_type: coupon.discountType,
      discount_percent:
        coupon.discountType === 'PERCENT' && coupon.percentBps != null
          ? coupon.percentBps / 100
          : null,
      discount_amount_usdt: coupon.amountUsdt,
      discount_amount_vnd: coupon.amountVnd,
      cost_point: coupon.costPoint ?? 0,
      used_at: row.usedAt?.toISOString() ?? null,
      expires_at: coupon.endsAt?.toISOString() ?? null,
      can_use: canUse,
      cannot_use_reason: cannotUseReason,
    });
  }

  return items;
}
