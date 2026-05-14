import Image from "next/image";
import Link from "next/link";
import type { StoreHeroProps } from "./store-hero.types";
import styles from "./store-hero.module.scss";

export function StoreHero({ lang, dict }: StoreHeroProps) {
  return (
    <section className={styles.section}>
      <Image
        src="/banner.png"
        alt={`${dict.brand} - ${dict.hero.headline}`}
        fill
        sizes="(max-width: 1024px) 100vw, 1024px"
        className={styles.banner}
        priority
      />
      <div className={styles.overlay}>
        <span className={styles.badge}>{dict.hero.badge}</span>
        <h1 className={styles.headline}>{dict.hero.headline}</h1>
        <p className={styles.subHeadline}>{dict.hero.subHeadline}</p>
        <p className={styles.tagline}>{dict.tagline}</p>
        <Link href={`/${lang}/products`} className={styles.cta}>
          {dict.hero.cta} →
        </Link>
      </div>

      <div className="sr-only">
        <h2>Chào mừng đến với {dict.brand}</h2>
        <p>Cửa hàng tài khoản số hàng đầu với {dict.hero.subHeadline} cho tất cả sản phẩm. Mua ngay để nhận ưu đãi tốt nhất!</p>
        <p>Chuyên cung cấp: Tài khoản game, phần mềm, dịch vụ số chất lượng cao với giá cả phải chăng.</p>
      </div>
    </section>
  );
}
