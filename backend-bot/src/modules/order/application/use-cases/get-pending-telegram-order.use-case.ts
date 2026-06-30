import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { buildOrderExpiry } from '../../domain/order-pricing';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';
import {
  TelegramOrderPendingQueryDto,
  TelegramOrderPendingResponseDto,
} from '../dto/telegram-order-pending.dto';

@Injectable()
export class GetPendingTelegramOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: TelegramOrderPendingQueryDto): Promise<TelegramOrderPendingResponseDto | null> {
    const userId = await this.orderRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const pending = await this.orderRepository.findActivePendingOrder(userId);
    if (!pending) return null;

    const expiry = buildOrderExpiry(pending.createdAt, pending.paymentMethod);

    return {
      order_id: pending.orderId,
      payment_code: pending.paymentCode,
      status: pending.status,
      payment_method: pending.paymentMethod,
      currency: pending.currency,
      total_price: pending.totalPrice,
      quantity: pending.quantity,
      item_name: pending.itemName,
      expires_at: expiry.expiresAt,
      seconds_left: expiry.secondsLeft,
    };
  }
}
