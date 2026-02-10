export interface SepayTransaction {
  id?: string | number;
  transaction_id?: string | number;
  transaction_content?: string;
  content?: string;
  description?: string;
  amount_in?: number | string;
  amount?: number | string;
  transaction_date?: string;
}

const API_URL = 'https://my.sepay.vn/userapi/transactions/list';

function normalizeVndAmount(value: number): number {
  return Math.round(value);
}

function transactionContent(tx: SepayTransaction): string {
  return String(tx.transaction_content ?? tx.content ?? tx.description ?? '').trim();
}

function transactionAmountIn(tx: SepayTransaction): number {
  const raw = tx.amount_in ?? tx.amount ?? 0;
  return normalizeVndAmount(Number(raw));
}

export class SepayGateway {
  constructor(
    private readonly apiKey: string,
    private readonly bankName: string,
    private readonly bankAccount: string,
    private readonly bankOwner: string,
    private readonly bankBin: string,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  isBankTransferConfigured(): boolean {
    return Boolean(
      this.bankName?.trim() &&
        this.bankAccount?.trim() &&
        this.bankOwner?.trim() &&
        this.bankBin?.trim(),
    );
  }

  /** SePay poll + STK/VietQR đủ để checkout BANK. */
  isBankCheckoutReady(): boolean {
    return this.isEnabled() && this.isBankTransferConfigured();
  }

  getBankName(): string {
    return this.bankName.trim();
  }

  getBankAccount(): string {
    return this.bankAccount.trim();
  }

  getBankOwner(): string {
    return this.bankOwner.trim();
  }

  getBankBin(): string {
    return this.bankBin.trim();
  }

  buildVietQrUrl(amountVnd: number, paymentCode: string): string | null {
    if (!this.isBankTransferConfigured()) return null;
    const amount = normalizeVndAmount(amountVnd);
    const code = String(paymentCode || '').trim();
    if (!code || amount <= 0) return null;
    const base = `https://img.vietqr.io/image/${this.getBankBin()}-${this.getBankAccount()}-compact2.png`;
    return `${base}?amount=${amount}&addInfo=${encodeURIComponent(code)}`;
  }

  async getTransactions(): Promise<SepayTransaction[]> {
    const key = this.apiKey.trim();
    if (!key) return [];

    const res = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { transactions?: SepayTransaction[] };
    return body?.transactions ?? [];
  }

  findMatchingPayment(
    transactions: SepayTransaction[],
    paymentCode: string,
    amountVnd: number,
    orderCreatedAt?: Date,
  ): SepayTransaction | null {
    const code = String(paymentCode || '').trim().toUpperCase();
    if (!code) return null;

    const expectedAmount = normalizeVndAmount(amountVnd);
    const createdAtMs = orderCreatedAt?.getTime() ?? 0;

    return (
      transactions.find((tx) => {
        const content = transactionContent(tx).toUpperCase();
        if (!content.includes(code)) return false;
        if (transactionAmountIn(tx) < expectedAmount) return false;

        if (createdAtMs > 0 && tx.transaction_date) {
          const txMs = new Date(tx.transaction_date).getTime();
          if (Number.isFinite(txMs) && txMs > 0 && txMs < createdAtMs - 60_000) {
            return false;
          }
        }

        return true;
      }) ?? null
    );
  }
}
