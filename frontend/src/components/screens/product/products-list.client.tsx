"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { Product } from "@/types/product";
import type { Pagination } from "@/types/api";
import { ProductGrid } from "@/components/domain/catalog/product-grid";
import { Button } from "@/components/ui";
import styles from "./products-list.module.scss";

type Props = {
  lang: Locale;
  dict: Dictionary;
  initialItems: Product[];
  initialPagination: Pagination;
  initialError: string | null;
  limit: number;
  categorySlug?: string;
};

export function ProductsListClient({
  lang,
  dict,
  initialItems,
  initialPagination,
  initialError,
  limit,
  categorySlug,
}: Props) {
  const [items, setItems] = useState<Product[]>(initialItems);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const canLoadMore = pagination.page < pagination.totalPages;

  const qsBase = useMemo(() => {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (categorySlug) qs.set("category", categorySlug);
    return qs;
  }, [categorySlug, limit]);

  async function loadMore() {
    if (!canLoadMore || loading) return;
    setLoading(true);
      setError(null);
    try {
      const nextPage = pagination.page + 1;
      const qs = new URLSearchParams(qsBase);
      qs.set("page", String(nextPage));
      const res = await fetch(`/api/products?${qs.toString()}`, {
        headers: { "x-language": lang },
      });
      const json = (await res.json()) as {
        data?: Product[];
        pagination?: Pagination;
        error?: { message?: string } | string;
      };
      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : json.error && typeof json.error === "object" && typeof json.error.message === "string"
              ? json.error.message
              : "Request failed";
        throw new Error(msg);
      }
      const nextItems = json.data;
      if (nextItems === undefined) throw new Error("unknown");
      setItems((prev) => prev.concat(nextItems));
      if (json.pagination) setPagination(json.pagination);
      else setPagination((p) => ({ ...p, page: nextPage }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <ProductGrid lang={lang} dict={dict} products={items} error={error} />
      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      {canLoadMore ? (
        <Button type="button" variant="outline" size="md" onClick={loadMore} disabled={loading}>
          {loading ? "Loading..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
