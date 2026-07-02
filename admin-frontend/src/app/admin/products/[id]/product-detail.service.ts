import {
  adminAddStock,
  adminCreatePlan,
  adminCreateVariant,
  adminDeletePlan,
  adminDeleteStock,
  adminDeleteVariant,
  adminGetProduct,
  adminListStock,
  adminUpdatePlan,
  adminUpdateProduct,
  adminUpdateVariant,
} from "@/lib/api/admin";
import { listShopCategories } from "@/lib/api/shops";

export const productDetailService = {
  get: (token: string, productId: number) => adminGetProduct(token, productId),
  listCategories: (token: string, shopId: string) =>
    listShopCategories(token, shopId),
  updateProduct: (token: string, id: number, input: Record<string, unknown>) =>
    adminUpdateProduct(token, id, input),
  createPlan: (
    token: string,
    productId: number,
    input: { slug: string; name_en: string; name_vi: string },
  ) => adminCreatePlan(token, productId, input),
  updatePlan: (
    token: string,
    productId: number,
    planId: number,
    input: {
      name_en?: string;
      name_vi?: string;
      sort_order?: number;
      is_active?: boolean;
    },
  ) => adminUpdatePlan(token, productId, planId, input),
  deletePlan: (token: string, productId: number, planId: number) =>
    adminDeletePlan(token, productId, planId),
  createVariant: (
    token: string,
    productId: number,
    input: Record<string, unknown>,
  ) => adminCreateVariant(token, productId, input),
  updateVariant: (
    token: string,
    variantId: number,
    input: Record<string, unknown>,
  ) => adminUpdateVariant(token, variantId, input),
  deleteVariant: (token: string, variantId: number) =>
    adminDeleteVariant(token, variantId),
  listStock: (
    token: string,
    args: { product_id?: number; variant_id?: number; status?: string },
  ) => adminListStock(token, args),
  addStock: (
    token: string,
    input: { variant_id: number; payloads: string | string[]; note?: string },
  ) => adminAddStock(token, input),
  deleteStock: (token: string, stockItemId: number) =>
    adminDeleteStock(token, stockItemId),
};
