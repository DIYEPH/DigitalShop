import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export interface AccountMenuProps {
  lang: Locale;
  dict: Dictionary;
}
