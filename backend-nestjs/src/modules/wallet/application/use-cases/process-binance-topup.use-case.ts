import { Inject, Injectable } from '@nestjs/common';
import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { BINANCE_PAY_GATEWAY } from '../../../../integration/binance/binance.tokens';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupEntity } from '../../domain/entities/topup.entity';
import { TopupRepository } from '../../domain/repositories/topup.repository';

@Injectable()
export class ProcessBinanceTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    @Inject(BINANCE_PAY_GATEWAY)
    private readonly binanceGateway: BinancePayGateway,
  ) {}

  async execute(topup: TopupEntity): Promise<boolean> {
    if (!this.binanceGateway.isEnabled()) return false;
    if (topup.status !== 'PENDING' || topup.provider !== 'BINANCE') return false;

    const transactions = await this.binanceGateway.getTransactionHistory();
    const matched = this.binanceGateway.findMatchingPayment(
      transactions,
      topup.paymentCode,
      topup.amount,
      topup.currency,
      topup.createdAt,
    );
    if (!matched) return false;

    const txId = this.binanceGateway.getExternalTxId(matched);
    if (!txId) return false;

    return this.topupRepository.confirmBinanceTopupAndCreditBalance(topup.id, txId);
  }
}
