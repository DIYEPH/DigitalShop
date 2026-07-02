import { PoolClient } from 'pg';
import { CouponRow } from '../../../order/domain/order-pricing';
import { ShopCouponRow } from '../entities/shop-coupon-row.entity';
import { UserCouponWalletRow } from '../entities/user-coupon-wallet-row.entity';

export type UserCouponListStatus = 'active' | 'used';

export interface ListUserCouponsParams {
  shopId: string;
  userId: number;
  status: UserCouponListStatus;
  variantId?: number;
}

export interface CouponRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  listUserCoupons(params: ListUserCouponsParams): Promise<UserCouponWalletRow[]>;
  listShopCoupons(shopId: string): Promise<ShopCouponRow[]>;
  findCouponByCode(shopId: string, code: string): Promise<CouponRow | null>;
  findUserCouponById(
    shopId: string,
    userCouponId: number,
    userId: number,
  ): Promise<UserCouponWalletRow | null>;
  findUnusedUserCouponByCode(
    shopId: string,
    userId: number,
    code: string,
  ): Promise<UserCouponWalletRow | null>;
  redeemShopCoupon(shopId: string, userId: number, code: string): Promise<{ userCouponId: number }>;
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
