import type { Language, TranslationKey } from "./types";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const LANGUAGE_STORAGE_KEY = "digitalshop.admin.language.v1";
export const DEFAULT_LANGUAGE: Language = "en";

export const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
];

export const DICTIONARY: Record<Language, Record<TranslationKey, string>> = {
  en,
  vi,
};
