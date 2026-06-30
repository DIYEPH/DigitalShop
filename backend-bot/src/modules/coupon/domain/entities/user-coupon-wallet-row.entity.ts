import { CouponRow } from '../../../order/domain/order-pricing';

export interface UserCouponWalletRow {
  userCouponId: number;
  usedAt: Date | null;
  coupon: CouponRow;
  productNameEn: string;
  productNameVi: string;
  variantNameEn: string;
  variantNameVi: string;
}
