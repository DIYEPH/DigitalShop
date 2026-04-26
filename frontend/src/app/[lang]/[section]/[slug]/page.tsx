import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/domain/catalog";
import { ProductsLayout } from "@/components/screens/product";
import { getSlugPageData } from "@/lib/pages/slug";
import { parsePageParam, parseSlugRouteParams, type PagedSearchParams, type SlugRouteParams } from "@/lib/i18n/params";

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<SlugRouteParams>;
  searchParams: Promise<PagedSearchParams>;
}) {
  const raw = await params;
  const resolved = parseSlugRouteParams(raw);
  if (!resolved) notFound();

  const { page } = await searchParams;
  const pageNum = parsePageParam(page);

  const data = await getSlugPageData({ ...resolved, pageNum });

  if (data.kind === "product") {
    return <ProductDetail lang={data.params.lang} dict={data.dict} product={data.product} />;
  }

  return (
    <ProductsLayout
      lang={data.params.lang}
      dict={data.dict}
      categories={data.categories}
      products={data.products}
      pageNum={data.pageNum}
      sectionTitle={`${data.category.name} (${data.products.pagination.total})`}
      selectedSlug={data.params.slug}
      categorySlug={data.params.slug}
      listKeyPrefix={data.params.slug}
    />
  );
}
