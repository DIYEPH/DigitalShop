import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { assertBankCheckoutConfigured } from '../../../../integration/bank/bank-checkout';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { buildOrderExpiry } from '../../domain/order-pricing';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';
import {
  TelegramOrderPaymentParams,
  TelegramOrderPaymentResponseDto,
} from '../dto/telegram-order-payment.dto';

@Injectable()
export class GetTelegramOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(
    shopId: string,
    input: TelegramOrderPaymentParams,
  ): Promise<TelegramOrderPaymentResponseDto> {
    const order = await this.orderRepository.findOrderPaymentForTelegram(
      shopId,
      input.order_id,
      input.telegram_id,
    );
    if (!order) {
      throw new ApiException('order_not_found', 'Order not found.', 404);
    }

    const [binanceGateway, sepayGateway] = await Promise.all([
      this.shopGateways.getBinance(shopId),
      this.shopGateways.getSepay(shopId),
    ]);

    if (order.paymentMethod === 'BANK' && order.status === 'PENDING') {
      assertBankCheckoutConfigured(sepayGateway);
    }

    const expiry = buildOrderExpiry(order.createdAt, order.paymentMethod);
    const deliveryLines =
      order.status === 'DELIVERED'
        ? await this.orderRepository.findOrderDeliveryLines(order.orderId)
        : null;

    const isBank = order.paymentMethod === 'BANK';
    const paymentCode = order.paymentMethod === 'CRYPTO' ? null : order.paymentCode;

    return {
      order_id: order.orderId,
      status: order.status,
      payment_method: order.paymentMethod,
      currency: order.currency,
      total_price: order.totalPrice,
      payment_code: paymentCode,
      binance_id:
        order.paymentMethod === 'BINANCE' ? binanceGateway?.getPayId() || null : null,
      binance_qr_url:
        order.paymentMethod === 'BINANCE' ? binanceGateway?.getPayQrUrl() ?? null : null,
      bank_name: isBank ? sepayGateway?.getBankName() ?? null : null,
      bank_account: isBank ? sepayGateway?.getBankAccount() ?? null : null,
      bank_owner: isBank ? sepayGateway?.getBankOwner() ?? null : null,
      vietqr_url:
        isBank && paymentCode && sepayGateway
          ? sepayGateway.buildVietQrUrl(order.totalPrice, paymentCode)
          : null,
      expires_at: expiry.expiresAt,
      seconds_left: expiry.secondsLeft,
      delivery_lines: deliveryLines?.length ? deliveryLines : null,
    };
  }
}
