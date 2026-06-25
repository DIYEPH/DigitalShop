/** Hiển thị giá USDT + VND (không quy đổi — chỉ format). */

export function formatUsdt(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n} USDT`;
}

export function formatVnd(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("vi-VN")} VND`;
}

export function pricesFromVariantList(
  prices: Array<{ currency: string; amount: string }> | undefined,
): { usdt: string | null; vnd: string | null } {
  const usdt = prices?.find((p) => p.currency === "USDT")?.amount ?? null;
  const vnd = prices?.find((p) => p.currency === "VND")?.amount ?? null;
  return { usdt, vnd };
}

export function buildVariantPricesPayload(usdt: number, vnd: number) {
  const prices: Array<{ currency: "USDT" | "VND"; amount: number }> = [];
  if (usdt > 0) prices.push({ currency: "USDT", amount: usdt });
  if (vnd > 0) prices.push({ currency: "VND", amount: vnd });
  return prices;
}
