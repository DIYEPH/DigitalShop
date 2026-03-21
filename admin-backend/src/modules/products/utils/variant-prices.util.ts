/** Giá variant — chỉ map currency client/DB gửi, không quy đổi tỷ giá. */

export type PriceInput = { currency: string; amount: number };

const MIN_USDT = 0.01;

export function resolvePricesForCreate(prices?: PriceInput[]) {
  const usdt = prices?.find((p) => p.currency === 'USDT')?.amount;
  const vnd = prices?.find((p) => p.currency === 'VND')?.amount;
  return {
    amountUsdt: usdt != null && usdt > 0 ? usdt : MIN_USDT,
    amountVnd: vnd != null && vnd > 0 ? vnd : 0,
  };
}

/** Chỉ cập nhật cột tương ứng currency có trong payload. */
export function resolvePricesForUpdate(prices?: PriceInput[]) {
  if (!prices?.length) return {};
  const usdt = prices.find((p) => p.currency === 'USDT')?.amount;
  const vnd = prices.find((p) => p.currency === 'VND')?.amount;
  return {
    ...(usdt != null && usdt > 0 ? { amountUsdt: usdt } : {}),
    ...(vnd != null && vnd > 0 ? { amountVnd: vnd } : {}),
  };
}

export function variantPricesFromRow(row: {
  amount_usdt: string;
  amount_vnd: string;
}): Array<{ currency: 'USDT' | 'VND'; amount: string }> {
  const out: Array<{ currency: 'USDT' | 'VND'; amount: string }> = [
    { currency: 'USDT', amount: String(Number(row.amount_usdt)) },
  ];
  const vnd = Number(row.amount_vnd);
  if (vnd > 0) {
    out.push({ currency: 'VND', amount: String(vnd) });
  }
  return out;
}
