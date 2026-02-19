import { Inject, Injectable } from '@nestjs/common';
import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { OrderPaymentEntity } from '../../domain/entities/order-payment.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { BINANCE_PAY_GATEWAY } from '../../../../integration/binance/binance.tokens';
import { ORDER_REPOSITORY } from '../../order.tokens';

@Injectable()
export class ProcessBinanceOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(BINANCE_PAY_GATEWAY)
    private readonly binanceGateway: BinancePayGateway,
  ) {}

  async execute(order: OrderPaymentEntity): Promise<boolean> {
    if (!this.binanceGateway.isEnabled()) return false;
    if (order.status !== 'PENDING' || order.paymentMethod !== 'BINANCE') return false;
    if (!order.paymentCode) return false;

    const transactions = await this.binanceGateway.getTransactionHistory();
    const matched = this.binanceGateway.findMatchingPayment(
      transactions,
      order.paymentCode,
      order.totalPrice,
      order.currency,
      order.createdAt,
    );
    if (!matched) return false;

    if (!this.binanceGateway.getExternalTxId(matched)) return false;

    const paid = await this.orderRepository.confirmOrderPaidByPaymentCode(
      order.orderId,
      'BINANCE',
    );
    if (!paid) return false;

    await this.orderRepository.deliverInStockOrder(order.orderId);
    return true;
  }
}
