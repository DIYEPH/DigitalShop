"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { getActiveEvents, type CarouselEvent } from "@/lib/api/events";
import {
  claimDailyLoginPoint,
  getDailyLoginPointMonthHistory,
  getDailyLoginPointStatus,
  type DailyLoginPointMonthHistoryItem,
} from "@/lib/api/me";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import type { Locale } from "@/lib/i18n/config";
import type { EventCarouselModalProps } from "./event-carousel-modal.types";
import styles from "./event-carousel-modal.module.scss";

function formatText(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function EventCarouselModal({
  lang,
  dict,
  open,
  onClose,
}: EventCarouselModalProps) {
  const [items, setItems] = useState<CarouselEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dailyReward, setDailyReward] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [monthHistory, setMonthHistory] = useState<DailyLoginPointMonthHistoryItem[]>([]);
  const { token, hydrated } = useAuthToken();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getActiveEvents({ lang })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setIndex(0);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(dict.auth.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [dict.auth.failed, lang, open]);

  useEffect(() => {
    if (!open) return;
    if (!token) return;
    let cancelled = false;
    Promise.all([
      getDailyLoginPointStatus({ token, lang }),
      getDailyLoginPointMonthHistory({ token, lang }),
    ])
      .then(([status, history]) => {
        if (cancelled) return;
        setClaimedToday(status.claimedToday);
        setDailyReward(status.reward);
        setMonthHistory(history.items);
      })
      .catch(() => {
        if (!cancelled) setClaimError(dict.layout.eventModalDailyPointFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lang, token, dict.layout.eventModalDailyPointFailed]);

  const item = items[index] ?? null;
  const visibleMonthHistory = token ? monthHistory : [];
  const loading = open && !error && items.length === 0;
  const counter = useMemo(
    () => formatText(dict.layout.eventModalCounter, { current: String(index + 1), total: String(items.length || 1) }),
    [dict.layout.eventModalCounter, index, items.length],
  );

  if (!open) return null;

  const authReady = hydrated;
  const dailyPointCta = claimedToday
    ? formatText(dict.layout.eventModalDailyPointClaimed, { points: String(dailyReward || 0) })
    : formatText(dict.layout.eventModalDailyPointClaim, { points: String(dailyReward || 0) });

  const onClaimDailyPoint = async () => {
    if (!token || claiming || claimedToday) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const result = await claimDailyLoginPoint({ token, lang });
      setClaimedToday(result.claimedToday);
      setDailyReward(result.reward);
      const history = await getDailyLoginPointMonthHistory({ token, lang });
      setMonthHistory(history.items);
    } catch {
      setClaimError(dict.layout.eventModalDailyPointFailed);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <h2 className={styles.modalTitle}>{dict.layout.eventModalTitle}</h2>
          <Button
            type="button"
            image
            onClick={onClose}
            aria-label={dict.layout.eventModalClose}
            className={styles.closeButton}
          >
            <XCircle size={24} strokeWidth={2} />
          </Button>
        </div>

        {loading ? <p className={styles.loadingText}>...</p> : null}
        {error ? <p className={styles.errorBanner}>{error}</p> : null}
        {!loading && !error && !item ? <p className={styles.emptyText}>{dict.layout.eventModalEmpty}</p> : null}

        <div className={styles.dailySection}>
          <div className={styles.dailyTitle}>{dict.layout.eventModalDailyPointTitle}</div>
          <div className={styles.dailyActions}>
            {!authReady ? null : token ? (
              <Button type="button" variant="outline" disabled={claimedToday || claiming} onClick={() => void onClaimDailyPoint()}>
                {dailyPointCta}
              </Button>
            ) : (
              <span className={styles.needLogin}>{dict.layout.eventModalDailyPointNeedLogin}</span>
            )}
          </div>
          <div className={styles.historySection}>
            <div className={styles.historyTitle}>{dict.layout.eventModalDailyPointMonthTitle}</div>
            {visibleMonthHistory.length === 0 ? (
              <p className={styles.historyEmpty}>{dict.layout.eventModalDailyPointEmptyMonth}</p>
            ) : (
              <ul className={styles.historyList}>
                {visibleMonthHistory.map((entry) => {
                  const day = new Date(entry.claimDate).getDate();
                  return (
                    <li key={entry.id} className={styles.historyItem}>
                      {formatText(dict.layout.eventModalDailyPointDay, {
                        day: String(day),
                        points: String(entry.pointsAwarded),
                      })}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {claimError ? <p className={styles.claimError}>{claimError}</p> : null}
        </div>

        {item ? (
          <div className={styles.carouselRoot}>
            <div className={styles.carouselMeta}>
              <span>{counter}</span>
              <span>{formatText(dict.layout.eventModalCreatedAt, { time: formatDate(item.created_at, lang) })}</span>
            </div>
            <div className={styles.viewport}>
              <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
                {items.map((eventItem) => (
                  <article key={eventItem.id} className={styles.slide}>
                    <h3 className={styles.slideTitle}>{eventItem.title}</h3>
                    {eventItem.image_url ? (
                      <div className={styles.imageFrame}>
                        <Image src={eventItem.image_url} alt={eventItem.title} fill className="object-cover" />
                      </div>
                    ) : null}
                    <p className={styles.payload}>{eventItem.payload}</p>
                    {eventItem.end_at ? (
                      <p className={styles.validUntil}>
                        {formatText(dict.layout.eventModalValidUntil, { time: formatDate(eventItem.end_at, lang) })}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
            {items.length > 1 ? (
              <div className={styles.navRow}>
                <Button variant="outline" disabled={index <= 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
                  {dict.layout.eventModalPrevious}
                </Button>
                <Button
                  variant="outline"
                  disabled={index >= items.length - 1}
                  onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}
                >
                  {dict.layout.eventModalNext}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
