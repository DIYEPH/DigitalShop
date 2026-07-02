import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { buildOrderExpiry } from '../../domain/order-pricing';
import { ORDER_REPOSITORY } from '../../order.tokens';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { TelegramOrderDetailResponseDto } from '../dto/telegram-order-detail.dto';

@Injectable()
export class GetTelegramOrderDetailUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(
    shopId: string,
    orderId: string,
    telegramId: number,
  ): Promise<TelegramOrderDetailResponseDto> {
    const userId = await this.orderRepository.findUserIdByTelegramId(telegramId);
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const detail = await this.orderRepository.findTelegramOrderDetail(shopId, orderId, userId);
    if (!detail) {
      throw new ApiException('order_not_found', 'Order not found.', 404);
    }

    const expiry =
      detail.status === 'PENDING'
        ? buildOrderExpiry(detail.createdAt, detail.paymentMethod)
        : { expiresAt: null, secondsLeft: null };

    return {
      order_id: detail.orderId,
      status: detail.status,
      total_price: detail.totalPrice,
      currency: detail.currency,
      payment_method: detail.paymentMethod,
      payment_code: detail.paymentCode,
      created_at: detail.createdAt.toISOString(),
      expires_at: expiry.expiresAt,
      seconds_left: expiry.secondsLeft,
      paid_at: detail.paidAt?.toISOString() ?? null,
      delivered_at: detail.deliveredAt?.toISOString() ?? null,
      items: detail.items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        snapshot_variant_name: item.snapshotVariantName,
        snapshot_fulfillment_type: item.snapshotFulfillmentType,
      })),
      delivery: {
        lines: detail.deliveryLines,
      },
    };
  }
}
