import type { Category } from "@/types/category";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export type StoreSidebarProps = {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  selectedSlug?: string;
  hotLimit?: number;
};

