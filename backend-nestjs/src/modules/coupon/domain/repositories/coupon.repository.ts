import { PoolClient } from 'pg';
import { CouponRow } from '../../../order/domain/order-pricing';
import { ShopCouponRow } from '../entities/shop-coupon-row.entity';
import { UserCouponWalletRow } from '../entities/user-coupon-wallet-row.entity';

export type UserCouponListStatus = 'active' | 'used';

export interface ListUserCouponsParams {
  userId: number;
  status: UserCouponListStatus;
  variantId?: number;
}

export interface CouponRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  listUserCoupons(params: ListUserCouponsParams): Promise<UserCouponWalletRow[]>;
  listShopCoupons(): Promise<ShopCouponRow[]>;
  findCouponByCode(code: string): Promise<CouponRow | null>;
  findUserCouponById(userCouponId: number, userId: number): Promise<UserCouponWalletRow | null>;
  findUnusedUserCouponByCode(userId: number, code: string): Promise<UserCouponWalletRow | null>;
  redeemShopCoupon(userId: number, code: string): Promise<{ userCouponId: number }>;
  consumeUserCoupon(
    client: PoolClient,
    userCouponId: number,
    userId: number,
    orderId: string,
  ): Promise<void>;
  countCouponRedemptions(
    couponId: number,
    userId: number,
    statuses: readonly string[],
  ): Promise<{ total: number; perUser: number }>;
}
