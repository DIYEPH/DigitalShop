import { RegisterPage as RegisterPageView } from "@/components/screens/auth";
import { getDictionary } from "@/lib/i18n/config";
import { parseLocaleParam, type LocaleRouteParams } from "@/lib/i18n/params";

export default async function RegisterPage({ params }: { params: Promise<LocaleRouteParams> }) {
  const { lang } = await params;
  const locale = parseLocaleParam(lang);
  if (!locale) return null;

  const dict = await getDictionary(locale);

  return <RegisterPageView lang={locale} dict={dict} />;
}

