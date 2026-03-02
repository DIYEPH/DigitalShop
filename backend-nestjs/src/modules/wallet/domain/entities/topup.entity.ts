export type TopupProvider = 'BINANCE' | 'BANK';
export type TopupCurrency = 'USDT' | 'VND';

export interface TopupEntity {
  id: number;
  userId: number;
  provider: TopupProvider;
  currency: TopupCurrency;
  amount: number;
  paymentCode: string;
  txId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  expiresAt: Date;
  paidAt: Date | null;
  createdAt: Date;
}
