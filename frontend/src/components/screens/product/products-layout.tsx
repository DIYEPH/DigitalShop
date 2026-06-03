import { StoreSidebar } from "@/components/domain/catalog";
import type { Category } from "@/types/category";
import type { ListProductsResult } from "@/lib/api/products";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { cn } from "@/lib/utils/cn";
import { ProductsListClient } from "./products-list.client";
import styles from "./products-layout.module.scss";

type ProductsLayoutProps = {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  products: ListProductsResult & { error: string | null };
  pageNum: number;
  sectionTitle?: string;
  selectedSlug?: string;
  categorySlug?: string;
  listKeyPrefix?: string;
};

export function ProductsLayout({
  lang,
  dict,
  categories,
  products,
  pageNum,
  sectionTitle,
  selectedSlug,
  categorySlug,
  listKeyPrefix = "products",
}: ProductsLayoutProps) {
  const heading =
    sectionTitle ??
    dict.store.allProductsHeading.replace("{total}", String(products.pagination.total));

  return (
    <div className={styles.productsPage}>
      <StoreSidebar
        lang={lang}
        dict={dict}
        categories={categories}
        selectedSlug={selectedSlug}
      />
      <section className={cn(styles.productsSection)}>
        <div className={styles.sectionTitle}>{heading}</div>

        <ProductsListClient
          key={`${listKeyPrefix}-${String(pageNum)}`}
          lang={lang}
          dict={dict}
          initialItems={products.items}
          initialPagination={products.pagination}
          initialError={products.error}
          limit={products.pagination.limit}
          categorySlug={categorySlug}
        />
      </section>
    </div>
  );
}
