"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/lib/i18n/config";
import type { Category } from "@/types/category";
import styles from "./store-sidebar.module.scss";

type Props = {
  lang: Locale;
  category?: Category;
  href: string;
  active?: boolean;
  label: string;
  defaultIconSrc?: string;
  defaultIcon?: ReactNode;
};

export function CategoryItem({ lang: _lang, category, href, active, label, defaultIconSrc, defaultIcon }: Props) {
  const router = useRouter();
  const img = category?.image_url ?? defaultIconSrc ?? null;
  const leftImage = img ? (
    <Image
      src={img}
      alt=""
      width={20}
      height={20}
      unoptimized
      className={styles.thumb}
    />
  ) : defaultIcon ? (
    <span aria-hidden className={styles.iconFallback}>
      {defaultIcon}
    </span>
  ) : (
    <span aria-hidden className={styles.categoryDot} />
  );

  const count = category?.products_count ?? null;
  const rightImage =
    typeof count === "number" ? <span className={styles.count}>{count}</span> : null;

  return (
    <Button
      type="button"
      image
      leftImage={leftImage}
      rightImage={rightImage}
      className={cn(styles.sideItem, active && styles.sideItemActive)}
      onClick={() => router.replace(href, { scroll: false })}
    >
      <span className="truncate">{label}</span>
    </Button>
  );
}

