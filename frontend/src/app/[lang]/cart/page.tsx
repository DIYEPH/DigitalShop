import { CartScreen } from "@/components/screens/cart";
import { getDictionary } from "@/lib/i18n/config";
import { parseLocaleParam, type LocaleRouteParams } from "@/lib/i18n/params";

export default async function CartPage({ params }: { params: Promise<LocaleRouteParams> }) {
  const { lang } = await params;
  const locale = parseLocaleParam(lang);
  if (!locale) return null;

  const dict = await getDictionary(locale);

  return <CartScreen lang={locale} dict={dict} />;
}
