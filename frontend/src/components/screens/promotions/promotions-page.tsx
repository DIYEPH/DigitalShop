import { Button, Card } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "../screen-layout.module.scss";

type PromotionsPageProps = {
  lang: Locale;
  dict: Dictionary;
};

export function PromotionsPage({ lang, dict }: PromotionsPageProps) {
  return (
    <section className={styles.promoWrap}>
      <Card className={styles.promoCard}>
        <p className={styles.kicker}>{dict.nav.deals}</p>
        <h1 className={styles.promoTitle}>{dict.store.promotionsTitle}</h1>
        <p className={styles.promoDesc}>{dict.store.promotionsDesc}</p>
        <div className={styles.promoActions}>
          <Button href={`/${lang}/products`} variant="primary" size="lg">
            {dict.cart.continueShopping}
          </Button>
        </div>
      </Card>
    </section>
  );
}

