import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export type StorePaginationProps = {
  lang: Locale;
  categorySlug?: string;
  page: number;
  totalPages: number;
  dict: Dictionary;
};

