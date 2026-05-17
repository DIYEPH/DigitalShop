"use client";

import { useCheckout } from "@/lib/cart/use-checkout";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { SummarySection } from "./summary-section";
import { PaymentSection } from "./payment-section";
import type { CheckoutFormProps } from "./checkout-form.types";
import styles from "./checkout-form.module.scss";

export function CheckoutForm({ lang, dict }: CheckoutFormProps) {
  const c = useCheckout(lang);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    c.submit(dict.checkout.loginRequired, dict.checkout.error);
  };

  if (!c.hydrated) return <p className={styles.loading}>…</p>;

  if (c.items.length === 0) {
    return (
      <div className={cn("store-card", styles.emptyCard)}>
        <p className={styles.emptyKicker}>{dict.nav.cart}</p>
        <h2 className={styles.emptyTitle}>{dict.checkout.emptyCartTitle}</h2>
        <p className={styles.emptyText}>{dict.checkout.emptyCartDesc}</p>
        <Button href={`/${lang}/products`} variant="primary" size="lg" className="mt-stack-relaxed">
          {dict.cart.continueShopping}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={styles.formGrid}>
      <SummarySection lang={lang} dict={dict} c={c} />
      <PaymentSection lang={lang} dict={dict} c={c} />
    </form>
  );
}
