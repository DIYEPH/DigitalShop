import type { StoreFooterProps } from "./store-footer.types";
import styles from "./store-footer.module.scss";

export function StoreFooter({ lang: _lang, dict }: StoreFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <div className={styles.brand}>{dict.brand}</div>
        <span className={styles.rights}>{dict.layout.allRightsReserved}</span>
      </div>
    </footer>
  );
}
