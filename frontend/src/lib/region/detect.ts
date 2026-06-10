import { headers } from "next/headers";
import type { Locale } from "../i18n/config";

/** Best-effort ISO country from headers (override via FORCE_COUNTRY or X-Country). */
export async function detectCountry(): Promise<string> {
  if (process.env.FORCE_COUNTRY) return process.env.FORCE_COUNTRY.toUpperCase();

  const h = await headers();
  const fromHeader = h.get("x-country") || h.get("cf-ipcountry") || h.get("x-vercel-ip-country");
  if (fromHeader) return fromHeader.toUpperCase();

  const match = (h.get("accept-language") || "").match(/-([A-Z]{2})/i);
  return match ? match[1].toUpperCase() : "US";
}

export function countryToLocale(country: string): Locale {
  return country.toUpperCase() === "VN" ? "vi" : "en";
}
