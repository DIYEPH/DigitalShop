import { apiFetch } from "./client";
import type { Locale } from "../i18n/config";

export type MeUser = {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
};

export type DailyLoginPointStatus = {
  claimedToday: boolean;
  reward: number;
  points: number;
};

export type DailyLoginPointClaimResult = {
  claimed: boolean;
  claimedToday: boolean;
  reward: number;
  points: number;
};

export type DailyLoginPointMonthHistoryItem = {
  id: number;
  claimDate: string;
  pointsAwarded: number;
  createdAt: string;
};

export async function getMyProfile(args: { token: string; lang?: Locale }) {
  const { token, lang } = args;
  return apiFetch<{ user: MeUser }>(`/api/me/profile`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}

export async function updateMyProfile(args: { token: string; lang?: Locale; email: string }) {
  const { token, lang, email } = args;
  return apiFetch<{ user: MeUser }>(`/api/me/profile`, {
    method: "PUT",
    token,
    lang,
    body: { email },
    cache: "no-store",
  });
}

export async function changeMyPassword(args: {
  token: string;
  lang?: Locale;
  current_password: string;
  new_password: string;
}) {
  const { token, lang, current_password, new_password } = args;
  return apiFetch<{ message: string }>(`/api/me/password`, {
    method: "PUT",
    token,
    lang,
    body: { current_password, new_password },
    cache: "no-store",
  });
}

export async function getDailyLoginPointStatus(args: { token: string; lang?: Locale }) {
  const { token, lang } = args;
  return apiFetch<DailyLoginPointStatus>(`/api/me/points/daily-login`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}

export async function claimDailyLoginPoint(args: { token: string; lang?: Locale }) {
  const { token, lang } = args;
  return apiFetch<DailyLoginPointClaimResult>(`/api/me/points/daily-login/claim`, {
    method: "POST",
    token,
    lang,
    cache: "no-store",
  });
}

export async function getDailyLoginPointMonthHistory(args: { token: string; lang?: Locale }) {
  const { token, lang } = args;
  return apiFetch<{ items: DailyLoginPointMonthHistoryItem[] }>(`/api/me/points/daily-login/month-history`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
}
