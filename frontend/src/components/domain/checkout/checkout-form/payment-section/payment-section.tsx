"use client";

import Image from "next/image";
import { Button, FormField, Input, RadioCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { PaymentSectionProps } from "./payment-section.types";
import { usePaymentSection } from "./payment-section.hooks";
import styles from "./payment-section.module.scss";

export function PaymentSection({ lang, dict, c }: PaymentSectionProps) {
  const { mm, ss, getPaymentMeta } = usePaymentSection(c, dict);

  return (
    <section className={cn("store-card", styles.section)}>
      <h3 className={styles.title}>{dict.checkout.paymentMethod}</h3>

      {c.availablePayments.length === 0 ? (
        <div className={styles.alertDanger}>{dict.checkout.noSharedPayment}</div>
      ) : (
        <div className={styles.methods}>
          {c.availablePayments.map((m) => {
            const meta = getPaymentMeta(m);
            const selected = c.paymentMethod === m;
            return (
              <RadioCard key={m} showRadio={false} selected={selected} onSelect={() => c.setPaymentMethod(m)}>
                <div className={styles.row}>
                  <span
                    className={cn(styles.iconWrap, selected ? styles.iconSelected : styles.iconIdle)}
                    aria-hidden
                  >
                    <Image
                      src={meta.iconSrc}
                      alt=""
                      width={24}
                      height={24}
                      className={styles.iconImg}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.dataset.fallbackApplied) {
                          parent.dataset.fallbackApplied = "1";
                          parent.append(meta.iconFallback);
                        }
                      }}
                    />
                  </span>
                  <span className={styles.labels}>
                    <span className={styles.payTitle}>{dict.payments[m]}</span>
                    <span className={styles.payDesc}>{meta.desc}</span>
                  </span>
                  {meta.badge ? <span className={styles.recommendedBadge}>{meta.badge}</span> : null}
                </div>
              </RadioCard>
            );
          })}
        </div>
      )}

      <div className={styles.voucherBlock}>
        <FormField label={dict.checkout.voucherCode}>
          <div className={styles.voucherRow}>
            <Input
              value={c.voucherCode}
              onChange={(e) => c.setVoucherCode(e.target.value)}
              placeholder={dict.checkout.voucherPlaceholder}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={c.voucherStatus === "checking" || !c.voucherCode.trim()}
              onClick={() =>
                c.applyVoucher({
                  loginRequiredMsg: dict.checkout.loginRequired,
                  enterCodeMsg: dict.checkout.voucherEnterCode,
                  appliedMsg: dict.checkout.voucherApplied,
                  invalidMsg: dict.checkout.voucherInvalid,
                })
              }
              className="shrink-0"
            >
              {c.voucherStatus === "checking" ? dict.checkout.voucherChecking : dict.checkout.voucherApply}
            </Button>
          </div>
        </FormField>
        {c.voucherMessage ? (
          <div className={c.voucherStatus === "error" ? styles.voucherHintError : styles.voucherHintMuted}>
            {c.voucherMessage}
          </div>
        ) : null}
      </div>

      {c.pendingOrder ? (
        <div className={styles.pendingBanner}>
          <p className={styles.pendingText}>
            {dict.checkout.pendingOrder.replace("{id}", String(c.pendingOrder.id)).replace("{time}", `${mm}:${ss}`)}
          </p>
          <div className={styles.pendingActions}>
            <Button href={`/${lang}/payment/${c.pendingOrder.id}`} variant="primary">
              {dict.checkout.pendingContinue}
            </Button>
            <Button type="button" variant="outline" disabled={c.pendingActionLoading} onClick={() => void c.cancelPending(dict.checkout.error)}>
              {c.pendingActionLoading ? dict.checkout.pendingCancelling : dict.checkout.pendingCancel}
            </Button>
            <Button type="button" variant="ghost" onClick={c.dismissPending}>
              {dict.checkout.pendingDismiss}
            </Button>
          </div>
        </div>
      ) : null}

      {c.error ? <p className={styles.formError}>{c.error}</p> : null}

      <Button type="submit" disabled={c.submitting || c.availablePayments.length === 0} variant="primary" size="lg" className={styles.submitBtn}>
        {c.submitting ? dict.checkout.placing : dict.checkout.placeOrder}
      </Button>
    </section>
  );
}
