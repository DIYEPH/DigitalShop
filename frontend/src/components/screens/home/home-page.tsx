import { StoreHero, StoreIntro } from "@/components/domain/catalog";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import styles from "./home-page.module.scss";

type HomePageProps = {
  lang: Locale;
  dict: Dictionary;
};

export function HomePage({ lang, dict }: HomePageProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: dict.brand,
    description: dict.tagline,
    url: `/${lang}`,
    offers: {
      "@type": "Offer",
      description: dict.hero.subHeadline,
      availability: "https://schema.org/InStock",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `/${lang}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className={styles.page}>
      <StoreHero lang={lang} dict={dict} />
      <StoreIntro lang={lang} dict={dict} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
