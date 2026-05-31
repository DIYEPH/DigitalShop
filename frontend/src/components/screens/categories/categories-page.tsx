import { CategoryChips } from "@/components/domain/catalog";
import type { Category } from "@/types/category";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "../screen-layout.module.scss";

type CategoriesPageProps = {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
};

export function CategoriesPage({ lang, dict, categories }: CategoriesPageProps) {
  return (
    <section className={styles.categories}>
      <h1 className={styles.catHeading}>{dict.categories.all}</h1>
      <CategoryChips lang={lang} dict={dict} categories={categories} />
    </section>
  );
}
