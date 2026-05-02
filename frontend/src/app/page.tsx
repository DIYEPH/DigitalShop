import { redirect } from "next/navigation";
import { countryToLocale, detectCountry } from "@/lib/region/detect";

/** Root: 307-redirect to `/vi` or `/en` based on detected country. */
export default async function RootRedirect() {
  const locale = countryToLocale(await detectCountry());
  redirect(`/${locale}`);
}
