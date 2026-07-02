import {
  adminCreateCoupon,
  adminGetProduct,
  adminGrantCouponToUser,
  adminListCoupons,
  adminListProducts,
  adminUpdateCoupon,
} from "@/lib/api/admin";
import type {
  AdminCreateCouponInput,
  AdminProductDetail,
} from "./coupons.types";

export const couponsService = {
  list: (token: string) => adminListCoupons(token),
  listProducts: (token: string) =>
    adminListProducts(token, { page: 1, limit: 100 }),
  getProduct: (token: string, productId: number): Promise<AdminProductDetail> =>
    adminGetProduct(token, productId),
  create: (token: string, input: AdminCreateCouponInput) =>
    adminCreateCoupon(token, input),
  update: (
    token: string,
    id: number,
    input: Partial<AdminCreateCouponInput>,
  ) => adminUpdateCoupon(token, id, input),
  grant: (
    token: string,
    input: { user_ids: string; code: string; quantity?: number },
  ) => adminGrantCouponToUser(token, input),
};
