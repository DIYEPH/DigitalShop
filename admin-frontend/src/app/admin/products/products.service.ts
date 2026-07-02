import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
} from "@/lib/api/admin";
import { listShopCategories } from "@/lib/api/shops";

export const productsService = {
  list: (token: string) => adminListProducts(token, { page: 1, limit: 50 }),
  listCategories: (token: string, shopId: string) =>
    listShopCategories(token, shopId),
  create: (token: string, input: Record<string, unknown>) =>
    adminCreateProduct(token, input),
  remove: (token: string, id: number) => adminDeleteProduct(token, id),
};
