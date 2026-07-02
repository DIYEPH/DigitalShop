export type {
  AdminCoupon,
  AdminCreateCouponInput,
  AdminProduct,
  AdminProductDetail,
} from "@/lib/api/admin";

export type CouponTab = "promo" | "public" | "voucher" | "shop";

export type VoucherMode = "create" | "grant";

export type GrantForm = {
  user_ids: string;
  code: string;
  quantity: string;
};
