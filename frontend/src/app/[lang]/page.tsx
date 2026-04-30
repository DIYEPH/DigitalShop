import { HomePage } from "@/components/screens/home";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n/config";
import type { Metadata } from "next";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ lang: string }> 
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const dict = await getDictionary(locale);
  
  const title = `${dict.brand} - ${dict.hero.headline} ${dict.hero.subHeadline}`;
  const description = locale === "vi" 
    ? `Khám phá ${dict.brand} - cửa hàng tài khoản số uy tín. ${dict.hero.subHeadline} cho tất cả sản phẩm. Tài khoản game, phần mềm chính hãng với giá tốt nhất thị trường.`
    : `Discover ${dict.brand} - trusted digital account store. ${dict.hero.subHeadline} on all products. Gaming accounts and genuine software at the best market prices.`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${locale}`,
    },
  };
}

export default async function LangHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const locale: Locale = lang;

  const dict = await getDictionary(locale);

  return <HomePage lang={locale} dict={dict} />;
}
