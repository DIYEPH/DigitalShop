"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthToken } from "@/lib/auth/use-auth-token";
import { getMyBalances } from "@/lib/api/balances";
import { getBalanceAmount } from "@/lib/utils/balance";
import type { Locale } from "@/lib/i18n/config";
import type { BalanceRow } from "@/types/balance";
import type { TopupViewState } from "./topup-view.types";

export function useTopupView(lang: Locale): TopupViewState & { token: string | null; hydrated: boolean } {
  const { token, hydrated } = useAuthToken();
  const [balances, setBalances] = useState<BalanceRow[] | null>(null);

  useEffect(() => {
    if (!hydrated || !token) return;
    getMyBalances({ token, lang })
      .then(setBalances)
      .catch(() => setBalances(null));
  }, [token, hydrated, lang]);

  const usdt = useMemo(() => getBalanceAmount(balances, "USDT"), [balances]);

  return { token, hydrated, balances, usdt };
}
