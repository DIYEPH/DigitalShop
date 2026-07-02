import { Inject, Injectable } from '@nestjs/common';
import { buildSepayTopupTxId } from '../../../../integration/bank/sepay-tx-id';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupEntity } from '../../domain/entities/topup.entity';
import { TopupRepository } from '../../domain/repositories/topup.repository';

@Injectable()
export class ProcessBankTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(topup: TopupEntity): Promise<boolean> {
    if (topup.status !== 'PENDING' || topup.provider !== 'BANK' || topup.currency !== 'VND') {
      return false;
    }

    const sepayGateway = await this.shopGateways.getSepay(topup.shopId);
    if (!sepayGateway?.isBankCheckoutReady()) return false;

    const transactions = await sepayGateway.getTransactions();
    const matched = sepayGateway.findMatchingPayment(
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
