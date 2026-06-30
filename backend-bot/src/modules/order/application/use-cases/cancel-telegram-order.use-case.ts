import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';
import { TelegramOrderCancelDto } from '../dto/telegram-order-pending.dto';

@Injectable()
export class CancelTelegramOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: TelegramOrderCancelDto): Promise<{ order_id: string; status: string }> {
    const userId = await this.orderRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const cancelled = await this.orderRepository.cancelPendingOrder(userId, input.order_id);
    if (!cancelled) {
      throw new ApiException('order_not_cancellable', 'Order not found or cannot be cancelled.', 404);
    }

    return { order_id: input.order_id, status: 'CANCELLED' };
  }
}
