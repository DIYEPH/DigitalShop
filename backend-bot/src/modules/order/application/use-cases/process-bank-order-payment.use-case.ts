import { Inject, Injectable } from '@nestjs/common';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { OrderPaymentEntity } from '../../domain/entities/order-payment.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';

@Injectable()
export class ProcessBankOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(order: OrderPaymentEntity): Promise<boolean> {
    if (order.status !== 'PENDING' || order.paymentMethod !== 'BANK') return false;
    if (!order.paymentCode || order.currency !== 'VND') return false;

    const gateway = await this.shopGateways.getSepay(order.shopId);
    if (!gateway) return false;

    const transactions = await gateway.getTransactions();
    const matched = gateway.findMatchingPayment(
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
