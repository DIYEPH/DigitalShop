import { Inject, Injectable } from '@nestjs/common';
import { buildSepayTopupTxId } from '../../../../integration/bank/sepay-tx-id';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupEntity } from '../../domain/entities/topup.entity';
import { TopupRepository } from '../../domain/repositories/topup.repository';

@Injectable()
export class ProcessBankTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(topup: TopupEntity): Promise<boolean> {
    if (!this.sepayGateway.isBankCheckoutReady()) return false;
    if (topup.status !== 'PENDING' || topup.provider !== 'BANK' || topup.currency !== 'VND') {
      return false;
    }

    const transactions = await this.sepayGateway.getTransactions();
    const matched = this.sepayGateway.findMatchingPayment(
      transactions,
      topup.paymentCode,
      topup.amount,
      topup.createdAt,
    );
    if (!matched) return false;

    const txId = buildSepayTopupTxId(matched);
    return this.topupRepository.confirmBankTopupAndCreditBalance(topup.id, txId);
  }
}
