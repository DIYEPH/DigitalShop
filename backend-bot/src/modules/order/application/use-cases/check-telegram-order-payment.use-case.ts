import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';
import {
  TelegramOrderPaymentParams,
  TelegramOrderPaymentResponseDto,
} from '../dto/telegram-order-payment.dto';
import { GetTelegramOrderPaymentUseCase } from './get-telegram-order-payment.use-case';
import { ProcessBankOrderPaymentUseCase } from './process-bank-order-payment.use-case';
import { ProcessBinanceOrderPaymentUseCase } from './process-binance-order-payment.use-case';

@Injectable()
export class CheckTelegramOrderPaymentUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    private readonly processBinancePayment: ProcessBinanceOrderPaymentUseCase,
    private readonly processBankPayment: ProcessBankOrderPaymentUseCase,
    private readonly getTelegramOrderPayment: GetTelegramOrderPaymentUseCase,
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

    if (order.status === 'PENDING' && order.paymentMethod === 'BINANCE') {
      await this.processBinancePayment.execute(order);
    } else if (order.status === 'PENDING' && order.paymentMethod === 'BANK') {
      await this.processBankPayment.execute(order);
    } else if (order.status === 'PAID') {
      await this.orderRepository.deliverInStockOrder(order.orderId);
    }

    return this.getTelegramOrderPayment.execute(shopId, input);
  }
}
