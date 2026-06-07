import { apiFetch, apiFetchPaginated } from "./client";
import type { Product } from "../../types/product";
import type { Pagination } from "../../types/api";
import type { Locale } from "../i18n/config";

export interface ListProductsParams {
  lang: Locale;
  page?: number;
  limit?: number;
  categorySlug?: string;
  categoryId?: number | string;
}

export interface ListProductsResult { items: Product[]; pagination: Pagination }

export async function listProducts(params: ListProductsParams): Promise<ListProductsResult> {
  const { lang, page = 1, limit = 5, categorySlug, categoryId } = params;
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categorySlug) qs.set("category_slug", categorySlug);
  else if (categoryId) qs.set("category_id", String(categoryId));

  const { data, pagination } = await apiFetchPaginated<Product[]>(
    `/api/products?${qs.toString()}`,
    { lang, cache: "no-store" },
  );

  return {
    items: data,
    pagination: pagination ?? { page, limit, total: data.length, totalPages: 1 },
  };
}

export async function getProductBySlug(slug: string, lang: Locale): Promise<Product> {
  return apiFetch<Product>(`/api/products/slug/${encodeURIComponent(slug)}`, {
    lang,
    cache: "no-store",
    next: { revalidate: 0, tags: [`product:${slug}`] },
  });
}

/** Returns an empty list + error string instead of throwing (SSR fallback). */
export async function safeListProducts(params: ListProductsParams): Promise<ListProductsResult & { error: string | null }> {
  try {
    const res = await listProducts(params);
    return { ...res, error: null };
  } catch (err) {
    return {
      items: [],
      pagination: { page: params.page ?? 1, limit: params.limit ?? 5, total: 0, totalPages: 1 },
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
