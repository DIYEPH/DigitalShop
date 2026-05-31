import { CartItemList } from "@/components/domain/cart";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "../screen-layout.module.scss";

type CartScreenProps = {
  lang: Locale;
  dict: Dictionary;
};

export function CartScreen({ lang, dict }: CartScreenProps) {
  return (
    <div className={styles.max4xl}>
      <header className={styles.screenHeader}>
        <p className={styles.kicker}>{dict.nav.cart}</p>
        <h1 className={styles.headingCart}>{dict.cart.title}</h1>
      </header>
      <CartItemList lang={lang} dict={dict} />
    </div>
  );
}
