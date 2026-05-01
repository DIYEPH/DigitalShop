import { getDictionary, isLocale, type Locale } from "@/lib/i18n/config";
import { SmsPage as SmsPageView } from "@/components/screens/sms";

export default async function SmsRentalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const locale: Locale = lang;
  const dict = await getDictionary(locale);

  return <SmsPageView lang={locale} dict={dict} />;
}
