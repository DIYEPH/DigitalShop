import { apiFetch } from "./client";
import type { Locale } from "../i18n/config";
import type { BalanceRow } from "../../types/balance";

export type GetMyBalancesResponse = { balances: BalanceRow[] };

export async function getMyBalances(args: { token: string; lang?: Locale }): Promise<BalanceRow[]> {
  const { token, lang } = args;
  const res = await apiFetch<GetMyBalancesResponse>(`/api/me/balances`, {
    method: "GET",
    token,
    lang,
    cache: "no-store",
  });
  return res.balances;
}
