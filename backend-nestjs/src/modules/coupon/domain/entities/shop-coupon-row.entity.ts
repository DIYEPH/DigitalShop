import { CouponRow } from '../../../order/domain/order-pricing';

export interface ShopCouponRow {
  coupon: CouponRow;
  productNameEn: string;
  productNameVi: string;
  variantNameEn: string;
  variantNameVi: string;
}
