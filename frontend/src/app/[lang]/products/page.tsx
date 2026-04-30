import { ProductsLayout } from "@/components/screens/product";
import { parseLocaleParam, parsePageParam, type LocaleRouteParams, type PagedSearchParams } from "@/lib/i18n/params";
import { getProductsPageData } from "@/lib/pages/products";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<LocaleRouteParams>;
  searchParams: Promise<PagedSearchParams>;
}) {
  const { lang } = await params;
  const locale = parseLocaleParam(lang);
  if (!locale) return null;

  const { page } = await searchParams;
  const pageNum = parsePageParam(page);
  const { dict, categories, products } = await getProductsPageData(locale, pageNum);

  return (
    <ProductsLayout
      lang={locale}
      dict={dict}
      categories={categories}
      products={products}
      pageNum={pageNum}
    />
  );
}
