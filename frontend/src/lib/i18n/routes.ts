import type { Locale } from "./config";

// Unified URL segments for all locales.
const CATEGORY_SEGMENT = "category";
const PRODUCT_SEGMENT = "product";
export type RouteSection = "category" | "product";

export function routePath(lang: Locale, section: RouteSection, slug?: string): string {
  const seg = section === "category" ? CATEGORY_SEGMENT : PRODUCT_SEGMENT;
  return slug ? `/${lang}/${seg}/${slug}` : `/${lang}/${seg}`;
}

export function matchSection(segment: string): RouteSection | null {
  if (segment === CATEGORY_SEGMENT) return "category";
  if (segment === PRODUCT_SEGMENT) return "product";
  return null;
}
