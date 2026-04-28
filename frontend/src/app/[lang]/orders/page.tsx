import { OrdersList } from "@/components/domain/orders";
import { getDictionary } from "@/lib/i18n/config";
import { parseLocaleParam, type LocaleRouteParams } from "@/lib/i18n/params";

export default async function OrdersPage({ params }: { params: Promise<LocaleRouteParams> }) {
  const { lang } = await params;
  const locale = parseLocaleParam(lang);
  if (!locale) return null;

  const dict = await getDictionary(locale);

  return <OrdersList lang={locale} dict={dict} />;
}
