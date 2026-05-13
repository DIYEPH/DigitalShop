import { ProductCard } from "../product-card";
import type { ProductGridProps } from "./product-grid.types";
import styles from "./product-grid.module.scss";

export function ProductGrid({ lang, dict, products, error }: ProductGridProps) {
  if (error) return <p className={styles.errorBanner}>{dict.store.loadError}</p>;
  if (products.length === 0) return <p className={styles.empty}>{dict.store.empty}</p>;

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} lang={lang} dict={dict} product={product} />
      ))}
    </div>
  );
}
