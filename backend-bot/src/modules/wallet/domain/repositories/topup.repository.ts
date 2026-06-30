import { TopupEntity } from '../entities/topup.entity';

export interface CreateTopupParams {
  userId: number;
  amount: number;
  paymentCode: string;
  expiresAt: Date;
}

export interface TopupRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  findActivePendingTopup(userId: number): Promise<TopupEntity | null>;
  createBinanceTopup(params: CreateTopupParams): Promise<TopupEntity>;
  createBankTopup(params: CreateTopupParams): Promise<TopupEntity>;
  findTopupById(id: number, userId: number): Promise<TopupEntity | null>;
  cancelTopup(id: number, userId: number): Promise<boolean>;
  listPendingBinanceTopups(): Promise<TopupEntity[]>;
  listPendingBankTopups(): Promise<TopupEntity[]>;
  confirmBinanceTopupAndCreditBalance(id: number, txId: string): Promise<boolean>;
  confirmBankTopupAndCreditBalance(id: number, txId: string): Promise<boolean>;
  expireTimedPendingTopups(batchSize?: number): Promise<{ cancelledCount: number }>;
}
