import { PasswordForm } from "@/components/domain/account";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n/config";

export default async function PasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  return <PasswordForm lang={locale} dict={dict} />;
}
