import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { assertBankCheckoutConfigured } from '../../../../integration/bank/bank-checkout';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { buildOrderExpiry } from '../../domain/order-pricing';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { BINANCE_PAY_GATEWAY } from '../../../../integration/binance/binance.tokens';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
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
    @Inject(BINANCE_PAY_GATEWAY)
    private readonly binanceGateway: BinancePayGateway,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(input: TelegramOrderPaymentParams): Promise<TelegramOrderPaymentResponseDto> {
    const order = await this.orderRepository.findOrderPaymentForTelegram(
      input.order_id,
      input.telegram_id,
    );
    if (!order) {
      throw new ApiException('order_not_found', 'Order not found.', 404);
    }

    if (order.paymentMethod === 'BANK' && order.status === 'PENDING') {
      assertBankCheckoutConfigured(this.sepayGateway);
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
      binance_id: order.paymentMethod === 'BINANCE' ? this.binanceGateway.getPayId() || null : null,
      binance_qr_url:
        order.paymentMethod === 'BINANCE' ? this.binanceGateway.getPayQrUrl() : null,
      bank_name: isBank ? this.sepayGateway.getBankName() : null,
      bank_account: isBank ? this.sepayGateway.getBankAccount() : null,
      bank_owner: isBank ? this.sepayGateway.getBankOwner() : null,
      vietqr_url:
        isBank && paymentCode
          ? this.sepayGateway.buildVietQrUrl(order.totalPrice, paymentCode)
          : null,
      expires_at: expiry.expiresAt,
      seconds_left: expiry.secondsLeft,
      delivery_lines: deliveryLines?.length ? deliveryLines : null,
    };
  }
}
