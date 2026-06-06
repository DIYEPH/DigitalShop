import { apiFetch } from "./client";
import type { Category } from "../../types/category";
import type { Locale } from "../i18n/config";

export async function listCategories(lang: Locale, flat = true): Promise<Category[]> {
  return apiFetch<Category[]>(`/api/categories${flat ? "?flat=true" : ""}`, {
    lang,
    next: { revalidate: 300, tags: ["categories"] },
  });
}

export async function getCategoryBySlug(slug: string, lang: Locale): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${encodeURIComponent(slug)}`, {
    lang,
    next: { revalidate: 300, tags: [`category:${slug}`] },
  });
}

export async function safeListCategories(lang: Locale, flat = true): Promise<Category[]> {
  try { return await listCategories(lang, flat); } catch { return []; }
}

export async function safeGetCategoryBySlug(slug: string, lang: Locale): Promise<Category | null> {
  try { return await getCategoryBySlug(slug, lang); } catch { return null; }
}
