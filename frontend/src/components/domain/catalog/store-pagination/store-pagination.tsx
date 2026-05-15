import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import { routePath } from "@/lib/i18n/routes";
import { cn } from "@/lib/utils/cn";
import type { StorePaginationProps } from "./store-pagination.types";

export function StorePagination({
  lang,
  categorySlug,
  page,
  totalPages,
  dict,
}: StorePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const basePath = categorySlug ? routePath(lang, "category", categorySlug) : `/${lang}/products`;
  const hrefOf = (p: number) => `${basePath}?page=${p}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-stack-tight">
      {pages.map((p) => (
        <Link
          key={p}
          href={hrefOf(p)}
          className={cn("store-page", p === page && "store-page-active")}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Link>
      ))}
      <Link href={basePath} className="store-page">{dict.store.viewAll}</Link>
    </div>
  );
}
