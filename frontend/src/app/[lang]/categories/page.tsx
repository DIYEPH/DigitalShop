import { CategoriesPage as CategoriesPageView } from "@/components/screens/categories";
import { getDictionary, isLocale } from "@/lib/i18n/config";
import { safeListCategories } from "@/lib/api/categories";

type Params = { lang: string };

export default async function CategoriesPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;

  const dict = await getDictionary(lang);
  const categories = await safeListCategories(lang);

  return <CategoriesPageView lang={lang} dict={dict} categories={categories} />;
}
