import { getDictionary, isLocale, type Locale } from "@/lib/i18n/config";
import { PromotionsPage as PromotionsPageView } from "@/components/screens/promotions";

export default async function PromotionsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;

  const locale: Locale = lang;
  const dict = await getDictionary(locale);
  return <PromotionsPageView lang={locale} dict={dict} />;
}
