import { createHmac } from 'crypto';

export interface BinancePayTransaction {
  id?: string;
  transactionId?: string;
  status?: string;
  note?: string;
  amount: string;
  currency: string;
  transactionTime?: number;
  orderType?: string;
}

const INCOMING_PAY_ORDER_TYPES = new Set(['PAY', 'C2C']);

function normalizeAmount(value: number | string): number {
  return Math.round(Number(value) * 1e8) / 1e8;
}

function externalTxId(tx: BinancePayTransaction): string | null {
  const id = tx.transactionId ?? tx.id;
  return id ? String(id) : null;
}

export class BinancePayGateway {
  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string,
    private readonly payId: string,
    private readonly payQrUrl: string,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.apiKey && this.secretKey);
  }

  getPayId(): string {
    return this.payId;
  }

  getPayQrUrl(): string | null {
    const url = this.payQrUrl.trim();
    return url || null;
  }

  async getTransactionHistory(days = 3): Promise<BinancePayTransaction[]> {
    const timestamp = Date.now();
    const startTime = timestamp - days * 24 * 60 * 60 * 1000;
    const queryString = `limit=100&startTime=${startTime}&endTime=${timestamp}&timestamp=${timestamp}`;
    const signature = createHmac('sha256', this.secretKey).update(queryString).digest('hex');
    const url = `https://api.binance.com/sapi/v1/pay/transactions?${queryString}&signature=${signature}`;

    const res = await fetch(url, {
      headers: { 'X-MBX-APIKEY': this.apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: BinancePayTransaction[] };
    return body?.data ?? [];
  }

  findMatchingPayment(
    transactions: BinancePayTransaction[],
    note: string,
    amount: number,
    currency = 'USDT',
    orderCreatedAt?: Date,
  ): BinancePayTransaction | null {
    const expectedNote = String(note || '').trim();
    if (!expectedNote) return null;

    const expectedAmount = normalizeAmount(amount);
    const createdAtMs = orderCreatedAt?.getTime() ?? 0;
    const minTxTimeMs = createdAtMs > 0 ? createdAtMs - 60_000 : 0;

    return (
      transactions.find((tx) => {
        if (tx.status && tx.status !== 'SUCCESS') return false;
        if (String(tx.note || '').trim() !== expectedNote) return false;
        if (tx.currency !== currency) return false;
        if (normalizeAmount(tx.amount) !== expectedAmount) return false;
        if (Number(tx.amount) <= 0) return false;
        if (tx.orderType && !INCOMING_PAY_ORDER_TYPES.has(tx.orderType)) return false;
        if (!externalTxId(tx)) return false;

        const txTime = Number(tx.transactionTime ?? 0);
        if (minTxTimeMs > 0 && txTime > 0 && txTime < minTxTimeMs) return false;

        return true;
      }) ?? null
    );
  }

  getExternalTxId(tx: BinancePayTransaction): string | null {
    return externalTxId(tx);
  }
}
