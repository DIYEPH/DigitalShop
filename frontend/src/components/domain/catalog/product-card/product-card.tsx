"use client";

import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/utils/format";
import { routePath } from "@/lib/i18n/routes";
import { AddToCartButton } from "../add-to-cart-button/add-to-cart-button";
import type { ProductCardProps } from "./product-card.types";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import styles from "./product-card.module.scss";

export function ProductCard({ lang, dict, product }: ProductCardProps) {
  const badges = product.badges ?? [];
  const inStock = product.in_stock !== false;
  const pillClass = (kind: "popular" | "hot" | "new") => {
    if (kind === "hot") return styles.badgeHot;
    if (kind === "new") return styles.badgeNew;
    return styles.badgePopular;
  };

  return (
    <article className={cn("store-card", styles.card)}>
      <Link href={routePath(lang, "product", product.slug)} className={styles.link}>
        <div className={styles.cardInner}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              width={240}
              height={160}
              unoptimized
              className={styles.thumb}
            />
          ) : (
            <div className={styles.thumbPlaceholder} aria-hidden />
          )}

          <div className={styles.body}>
            <div className={styles.badgeRow}>
              {!inStock ? <span className={styles.badgeSoldOut}>{dict.store.soldOut}</span> : null}
              {badges.map((b) => (
                <span key={b} className={pillClass(b)}>
                  {b === "hot" ? dict.store.badgeHot : b === "new" ? dict.store.badgeNew : dict.store.badgePopular}
                </span>
              ))}
            </div>

            <h3 className={styles.title}>{product.name}</h3>
            <p className={styles.desc}>{(product.description ?? "").replace(/<[^>]*>/g, "")}</p>
          </div>
        </div>
      </Link>

      <div className={styles.priceBlock}>
        <div className={styles.priceRow}>
          <p className={styles.price}>{formatPrice(product.price, product.currency, lang)}</p>
        </div>
        {typeof product.sold_count === "number" && (
          <p className={styles.soldCount}>{dict.store.soldCount.replace("{count}", String(product.sold_count))}</p>
        )}
      </div>

      <div className={styles.actions}>
        {inStock ? (
          <AddToCartButton lang={lang} dict={dict} product={product} />
        ) : (
          <Button type="button" variant="outline" size="md" className="w-full justify-center" disabled>
            {dict.store.soldOut}
          </Button>
        )}
      </div>
    </article>
  );
}
