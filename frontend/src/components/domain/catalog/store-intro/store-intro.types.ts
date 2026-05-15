import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export type StoreIntroProps = {
  lang: Locale;
  dict: Dictionary;
};