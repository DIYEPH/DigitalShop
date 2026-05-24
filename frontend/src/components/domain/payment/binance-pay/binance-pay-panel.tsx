"use client";

import { formatPrice } from "@/lib/utils/format";
import type { BinancePayPanelProps } from "./binance-pay-panel.types";
import { BINANCE_GUIDE_STEPS } from "./binance-pay-panel.constants";
import { useBinancePayPanel } from "./binance-pay-panel.hooks";
import styles from "./binance-pay-panel.module.scss";

export function BinancePayPanel({ lang, dict, order, payment, countdown }: BinancePayPanelProps) {
  const { binanceId, transferNote, binanceUsername, createdAt } = useBinancePayPanel({
    lang,
    dict,
    order,
    payment,
    countdown,
  });

  return (
    <div className={styles.root}>
      <div className={styles.rowTop}>
        <div className={styles.cardSuccess}>
          <h3 className={styles.successTitle}>{dict.checkout.successTitle}</h3>
          <p className={`${styles.textFgSoft} ${styles.successMessage}`}>{dict.checkout.successMessage}</p>
        </div>
        <div className={styles.cardStatus}>
          <div className={styles.statusRow}>
            <span className={styles.labelMuted}>{dict.checkout.status}</span>
            <span className={styles.statusPill}>{order.status}</span>
          </div>
          {countdown ? (
            <div className={styles.kvStack}>
              <div className={styles.countdownLabel}>{dict.checkout.timeLeftToComplete}</div>
              <div className={styles.countdownValue}>
                {countdown.mm}:{countdown.ss}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.rowMid}>
        <div className={styles.panelPad}>
          <h4 className={styles.sectionHeading}>{dict.checkout.payInstructions}</h4>
          <div className={styles.instrStack}>
            <div className={styles.insetBox}>
              <div className={styles.labelMuted}>{dict.cart.total}</div>
              <div className={styles.amountXL}>{formatPrice(payment.amount, "USDT", lang)}</div>
            </div>
            <div className={styles.insetBox}>
              <div className={styles.labelMuted}>{dict.checkout.transferNote}</div>
              <div className={styles.monoStrong}>{transferNote || "-"}</div>
            </div>
            <div className={styles.kvCard}>
              <div className={styles.kvRow}>
                <span className={styles.kvMuted}>{dict.checkout.pendingOrderId}</span>
                <span className={styles.kvStrong}>#{order.id}</span>
              </div>
              <div className={`${styles.kvRow} ${styles.kvStack}`}>
                <span className={styles.kvMuted}>{dict.checkout.pendingCreatedAt}</span>
                <span className={styles.kvSemibold}>{createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.panelPad}>
          <h4 className={styles.sectionHeading}>{dict.checkout.binancePayTitle}</h4>
          <div className={styles.binanceGrid}>
            <div className={styles.qrColumn}>
              <div className={styles.qrTitle}>{dict.checkout.binanceScanQr}</div>
              <div className={styles.qrHint}>{dict.checkout.binanceScanQrHint}</div>
              <div className={styles.qrPlaceholder}>{dict.checkout.binanceQrPlaceholder}</div>
            </div>
            <div className={styles.orCircle}>OR</div>
            <div className={styles.idColumn}>
              <div className={styles.idTitle}>{dict.checkout.binanceSendToId}</div>
              <div className={styles.idHint}>{dict.checkout.binanceSendToIdHint}</div>
              <div className={styles.copyStack}>
                <div className={styles.copyBlock}>
                  <div className={styles.copyLabel}>{dict.checkout.binanceUsername}</div>
                  <div className={styles.copyValue}>{binanceUsername || "-"}</div>
                </div>
                <div className={styles.copyBlock}>
                  <div className={styles.copyLabel}>{dict.checkout.binanceId}</div>
                  <div className={styles.copyValue}>{binanceId || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.howToPanel}>
        <h4 className={styles.sectionHeading}>{dict.checkout.binanceHowToTitle}</h4>
        <div className={styles.stepsGrid}>
          {BINANCE_GUIDE_STEPS.map((step) => (
            <div key={step} className={styles.stepCard}>
              <div className={styles.stepLabel}>{dict.checkout.binanceStep.replace("{n}", String(step))}</div>
              <div className={styles.stepVisual}>{dict.checkout.binanceGuidePlaceholder}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
