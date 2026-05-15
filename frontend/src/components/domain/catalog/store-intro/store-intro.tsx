import type { StoreIntroProps } from "./store-intro.types";
import styles from "./store-intro.module.scss";

export function StoreIntro({ lang: _lang, dict }: StoreIntroProps) {
  const cards = [
    { emoji: "🔒", title: dict.store.introSecurityTitle, desc: dict.store.introSecurityDesc },
    { emoji: "⚡", title: dict.store.introInstantTitle, desc: dict.store.introInstantDesc },
    { emoji: "💎", title: dict.store.introQualityTitle, desc: dict.store.introQualityDesc },
  ] as const;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{dict.store.whyChooseUs}</h2>
      <ul className={styles.grid}>
        {cards.map((c) => (
          <li key={c.title} className={styles.card}>
            <div className={styles.emoji} aria-hidden>
              {c.emoji}
            </div>
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardDesc}>{c.desc}</p>
          </li>
        ))}
      </ul>
      <p className={styles.tagline}>{dict.store.introTagline.replace("{brand}", dict.brand)}</p>
    </section>
  );
}
