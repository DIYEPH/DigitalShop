"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StoreSidebarProps } from "./store-sidebar.types";
import styles from "./store-sidebar.module.scss";
import { CategoryItem } from "./category-item";
import { routePath } from "@/lib/i18n/routes";
import { useStoreSidebar } from "./store-sidebar.hooks";

export function StoreSidebar({
  lang,
  dict,
  categories,
  selectedSlug,
  hotLimit = 6,
}: StoreSidebarProps) {
  const { roots, hasMore, parentToChildren } = useStoreSidebar({
    categories,
    hotLimit,
  });

  return (
    <aside className={cn(styles.panel, styles.sidebar, "h-full w-full")}>
      <div className={styles.sectionTitle}>{dict.store.categories}</div>

      <nav className={styles.nav}>
        <CategoryItem
          lang={lang}
          href={`/${lang}/products`}
          active={!selectedSlug}
          label={dict.categories.all}
          defaultIcon={<LayoutGrid size={16} strokeWidth={2.2} />}
        />
        {roots.map((c) => {
          const children = parentToChildren.get(c.id) ?? [];
          return (
            <div key={c.id} className={styles.categoryGroup}>
              <CategoryItem
                lang={lang}
                category={c}
                href={routePath(lang, "category", c.slug)}
                active={c.slug === selectedSlug}
                label={c.name}
              />
              {children.length > 0 ? (
                <div className={styles.childStack}>
                  {children.map((child) => (
                    <CategoryItem
                      key={child.id}
                      lang={lang}
                      category={child}
                      href={routePath(lang, "category", child.slug)}
                      active={child.slug === selectedSlug}
                      label={child.name}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {hasMore && (
          <Link href={`/${lang}/categories`} className={styles.viewAll}>
            {dict.store.viewAll} →
          </Link>
        )}
      </nav>
    </aside>
  );
}

