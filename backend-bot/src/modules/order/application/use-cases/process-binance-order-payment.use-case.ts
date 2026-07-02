import { Inject, Injectable } from '@nestjs/common';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { OrderPaymentEntity } from '../../domain/entities/order-payment.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';

@Injectable()
export class ProcessBinanceOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(order: OrderPaymentEntity): Promise<boolean> {
    if (order.status !== 'PENDING' || order.paymentMethod !== 'BINANCE') return false;
    if (!order.paymentCode) return false;

    const gateway = await this.shopGateways.getBinance(order.shopId);
    if (!gateway) return false;

    const transactions = await gateway.getTransactionHistory();
    const matched = gateway.findMatchingPayment(
      transactions,
      order.paymentCode,
      order.totalPrice,
      order.currency,
      order.createdAt,
    );
    if (!matched) return false;

    if (!gateway.getExternalTxId(matched)) return false;

    const paid = await this.orderRepository.confirmOrderPaidByPaymentCode(
      order.orderId,
      'BINANCE',
    );
    if (!paid) return false;

    await this.orderRepository.deliverInStockOrder(order.orderId);
    return true;
  }
}
