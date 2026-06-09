import { isLocale, type Locale } from "./config";
import { matchSection, type RouteSection } from "./routes";

export type LocaleRouteParams = { lang: string };
export type PagedSearchParams = { page?: string };
export type SlugRouteParams = { lang: string; section: string; slug: string };

export type ResolvedSlugRouteParams = {
  lang: Locale;
  section: RouteSection;
  slug: string;
};

export function parseLocaleParam(lang: string | undefined): Locale | null {
  return isLocale(lang) ? lang : null;
}

export function parsePageParam(pageRaw: string | undefined): number {
  return Math.max(1, Number(pageRaw ?? "1") || 1);
}

export function parseIdParam(id: string | undefined): string | null {
  const value = String(id || "").trim();
  return value ? value : null;
}

export function parseSlugRouteParams(input: {
  lang: string | undefined;
  section: string | undefined;
  slug: string | undefined;
}): ResolvedSlugRouteParams | null {
  if (!isLocale(input.lang) || !input.section || !input.slug) return null;
  const section = matchSection(input.section);
  if (!section) return null;
  return { lang: input.lang, section, slug: input.slug };
}
