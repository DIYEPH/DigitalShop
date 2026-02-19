import { Inject, Injectable } from '@nestjs/common';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { OrderPaymentEntity } from '../../domain/entities/order-payment.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
import { ORDER_REPOSITORY } from '../../order.tokens';

@Injectable()
export class ProcessBankOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(order: OrderPaymentEntity): Promise<boolean> {
    if (!this.sepayGateway.isEnabled()) return false;
    if (order.status !== 'PENDING' || order.paymentMethod !== 'BANK') return false;
    if (!order.paymentCode || order.currency !== 'VND') return false;

    const transactions = await this.sepayGateway.getTransactions();
    const matched = this.sepayGateway.findMatchingPayment(
      transactions,
      order.paymentCode,
      order.totalPrice,
      order.createdAt,
    );
    if (!matched) return false;

    const paid = await this.orderRepository.confirmOrderPaidByPaymentCode(order.orderId, 'BANK');
    if (!paid) return false;

    await this.orderRepository.deliverInStockOrder(order.orderId);
    return true;
  }
}
