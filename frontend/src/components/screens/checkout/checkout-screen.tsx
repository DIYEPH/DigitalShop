import { CheckoutForm } from "@/components/domain/checkout";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "../screen-layout.module.scss";

type CheckoutScreenProps = {
  lang: Locale;
  dict: Dictionary;
};

export function CheckoutScreen({ lang, dict }: CheckoutScreenProps) {
  return (
    <div className={styles.max6xl}>
      <header className={styles.screenHeader}>
        <p className={styles.kicker}>{dict.nav.checkout}</p>
        <h1 className={styles.headingCheckout}>{dict.checkout.title}</h1>
      </header>
      <CheckoutForm lang={lang} dict={dict} />
    </div>
  );
}
