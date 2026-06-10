import { getDictionary, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

export type OrderDetailsPageData = {
  lang: Locale;
  dict: Dictionary;
  id: string;
};

export async function getOrderDetailsPageData(
  lang: Locale,
  id: string,
): Promise<OrderDetailsPageData> {
  const dict = await getDictionary(lang);
  return { lang, dict, id };
}
