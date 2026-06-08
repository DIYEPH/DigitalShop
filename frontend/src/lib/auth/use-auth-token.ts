"use client";

import { useSyncExternalStore } from "react";
import { getAuthToken, subscribeAuthToken } from "@/lib/auth/token";

/** Reads the JWT token after hydration (SSR-safe). */
export function useAuthToken(): { token: string | null; hydrated: boolean } {
  const token = useSyncExternalStore(subscribeAuthToken, getAuthToken, () => null);
  return { token, hydrated: true };
}
