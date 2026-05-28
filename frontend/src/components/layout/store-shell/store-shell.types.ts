import type React from "react";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export interface StoreShellProps extends React.PropsWithChildren<object> {
  lang: Locale;
  dict: Dictionary;
}
