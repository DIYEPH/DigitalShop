import { notFound } from "next/navigation";
import { safeGetCategoryBySlug, safeListCategories } from "@/lib/api/categories";
import { getProductBySlug, safeListProducts, type ListProductsResult } from "@/lib/api/products";
import { getDictionary, type Locale } from "@/lib/i18n/config";
import type { ResolvedSlugRouteParams } from "@/lib/i18n/params";
import type { Dictionary } from "@/lib/i18n/types";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

const PAGE_SIZE = 10;

export type SlugPageProductData = {
  kind: "product";
  dict: Dictionary;
  params: ResolvedSlugRouteParams;
  product: Product;
};

export type SlugPageCategoryData = {
  kind: "category";
  dict: Dictionary;
  params: ResolvedSlugRouteParams;
  pageNum: number;
  categories: Category[];
  category: Category;
  products: ListProductsResult & { error: string | null };
};

export type SlugPageData = SlugPageProductData | SlugPageCategoryData;

export async function getSlugPageData(input: {
  lang: Locale;
  section: "product" | "category";
  slug: string;
  pageNum: number;
}): Promise<SlugPageData> {
  const dict = await getDictionary(input.lang);

  if (input.section === "product") {
    const product = await getProductBySlug(input.slug, input.lang);
    return {
      kind: "product",
      dict,
      params: { lang: input.lang, section: "product", slug: input.slug },
      product,
    };
  }

  const [categories, category, products] = await Promise.all([
    safeListCategories(input.lang),
    safeGetCategoryBySlug(input.slug, input.lang),
    safeListProducts({ lang: input.lang, page: input.pageNum, limit: PAGE_SIZE, categorySlug: input.slug }),
  ]);

  if (!category) notFound();

  return {
    kind: "category",
    dict,
    params: { lang: input.lang, section: "category", slug: input.slug },
    pageNum: input.pageNum,
    categories,
    category,
    products,
  };
}
