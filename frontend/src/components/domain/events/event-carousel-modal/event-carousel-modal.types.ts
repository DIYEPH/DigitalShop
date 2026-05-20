import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";

export interface EventCarouselModalProps {
  lang: Locale;
  dict: Dictionary;
  open: boolean;
  onClose: () => void;
}
