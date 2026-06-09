import type { Dictionary } from "@/lib/i18n/types";

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

type PartialDictionary = Partial<Dictionary>;

const mergeParts = (...parts: PartialDictionary[]): Dictionary =>
  Object.assign({}, ...parts) as Dictionary;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  vi: async () => {
    const [home, store, cart, checkout, auth] = await Promise.all([
      import("@locales/screens/home/vi.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/store/vi.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/cart/vi.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/checkout/vi.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/auth/vi.json").then((m) => m.default as PartialDictionary),
    ]);
    return mergeParts(home, store, cart, checkout, auth);
  },
  en: async () => {
    const [home, store, cart, checkout, auth] = await Promise.all([
      import("@locales/screens/home/en.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/store/en.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/cart/en.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/checkout/en.json").then((m) => m.default as PartialDictionary),
      import("@locales/screens/auth/en.json").then((m) => m.default as PartialDictionary),
    ]);
    return mergeParts(home, store, cart, checkout, auth);
  },
};

export async function getDictionary(lang: string): Promise<Dictionary> {
  return loaders[isLocale(lang) ? lang : defaultLocale]();
}

export const localeToCountry = (lang: Locale) => (lang === "vi" ? "VN" : "US");
