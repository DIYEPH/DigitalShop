import { Inject, Injectable } from '@nestjs/common';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupEntity } from '../../domain/entities/topup.entity';
import { TopupRepository } from '../../domain/repositories/topup.repository';

@Injectable()
export class ProcessBinanceTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(topup: TopupEntity): Promise<boolean> {
    if (topup.status !== 'PENDING' || topup.provider !== 'BINANCE') return false;

    const binanceGateway = await this.shopGateways.getBinance(topup.shopId);
    if (!binanceGateway) return false;

    const transactions = await binanceGateway.getTransactionHistory();
    const matched = binanceGateway.findMatchingPayment(
      transactions,
      topup.paymentCode,
      topup.amount,
      topup.currency,
      topup.createdAt,
    );
    if (!matched) return false;

    const txId = binanceGateway.getExternalTxId(matched);
    if (!txId) return false;

    return this.topupRepository.confirmBinanceTopupAndCreditBalance(topup.id, txId);
  }
}
