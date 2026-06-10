import type { BalanceCurrency, BalanceRow } from "@/types/balance";

export function getBalanceAmount(balances: BalanceRow[] | null | undefined, currency: BalanceCurrency): number {
  const raw = balances?.find((b) => b.currency === currency)?.amount ?? "0";
  return Number(raw);
}