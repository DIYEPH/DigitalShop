export type BalanceCurrency = "USDT" | "XU";

export type BalanceRow = {
  currency: BalanceCurrency;
  amount: string;
};
