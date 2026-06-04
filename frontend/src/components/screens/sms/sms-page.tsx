import { Button, Card } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "../screen-layout.module.scss";

type SmsPageProps = {
  lang: Locale;
  dict: Dictionary;
};

export function SmsPage({ lang, dict }: SmsPageProps) {
  return (
    <section className={styles.promoWrap}>
      <Card className={styles.promoCard}>
        <p className={styles.kicker}>{dict.store.hotbarSmsTab}</p>
        <h1 className={styles.promoTitle}>{dict.store.smsPlaceholderTitle}</h1>
        <p className={styles.promoDesc}>{dict.store.smsPlaceholderDesc}</p>
        <div className={styles.promoActions}>
          <Button href={`/${lang}/products`} variant="primary" size="lg">
            {dict.store.hotbarAccountsTab}
          </Button>
        </div>
      </Card>
    </section>
  );
}
