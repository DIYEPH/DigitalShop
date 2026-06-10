import { safeListCategories } from "@/lib/api/categories";
import { safeListProducts, type ListProductsResult } from "@/lib/api/products";
import { getDictionary, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { Category } from "@/types/category";

const PAGE_SIZE = 10;

export type ProductsPageData = {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  products: ListProductsResult & { error: string | null };
  pageNum: number;
};

export async function getProductsPageData(
  lang: Locale,
  pageNum: number,
): Promise<ProductsPageData> {
  const dict = await getDictionary(lang);
  const [categories, products] = await Promise.all([
    safeListCategories(lang),
    safeListProducts({ lang, page: pageNum, limit: PAGE_SIZE }),
  ]);

  return { lang, dict, categories, products, pageNum };
}
