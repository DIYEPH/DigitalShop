"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTDOWN_INTERVAL_MS } from "../product-detail.constants";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function usePromoCountdown(endsAt: string | null | undefined): {
  active: boolean;
  text: string | null;
} {
  const [nowMs, setNowMs] = useState(0);

  const endsAtMs = useMemo(() => {
    if (!endsAt) return null;
    const t = new Date(endsAt).getTime();
    return Number.isFinite(t) ? t : null;
  }, [endsAt]);

  const active = nowMs > 0 && endsAtMs !== null && endsAtMs > nowMs;

  useEffect(() => {
    if (endsAtMs === null) return;
    const timer = setInterval(() => setNowMs(Date.now()), COUNTDOWN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [endsAtMs]);

  const text = useMemo(() => {
    if (!active || endsAtMs === null) return null;
    const diff = Math.max(0, endsAtMs - nowMs);
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [active, endsAtMs, nowMs]);

  return { active, text };
}
