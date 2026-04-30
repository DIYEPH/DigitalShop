import { PaymentPageCard } from "@/components/domain/payment";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n/config";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) return null;

  const orderId = String(id || "").trim();
  if (!orderId) return null;

  const locale: Locale = lang;
  const dict = await getDictionary(locale);

  return <PaymentPageCard lang={locale} dict={dict} id={orderId} />;
}
