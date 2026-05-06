import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { Category } from "@/types/category";

export type CategoryChipsProps = {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  selectedSlug?: string;
};

