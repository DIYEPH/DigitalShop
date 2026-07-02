import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { ORDER_REPOSITORY } from '../../order.tokens';
import { OrderRepository } from '../../domain/repositories/order.repository';
import {
  TelegramOrderListQueryDto,
  TelegramOrderListResponseDto,
} from '../dto/telegram-order-list.dto';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

@Injectable()
export class ListTelegramOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(
    shopId: string,
    query: TelegramOrderListQueryDto,
  ): Promise<TelegramOrderListResponseDto> {
    const userId = await this.orderRepository.findUserIdByTelegramId(Number(query.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const page = Number(query.page) >= 1 ? Number(query.page) : 1;
    const limitRaw = Number(query.limit) >= 1 ? Number(query.limit) : DEFAULT_LIMIT;
    const limit = Math.min(MAX_LIMIT, limitRaw);

    const { items, total } = await this.orderRepository.listTelegramOrdersByUserId({
      shopId,
      userId,
      page,
      limit,
      statusGroup: query.status,
    });

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      items: items.map((item) => ({
        order_id: item.orderId,
        status: item.status,
        total_price: item.totalPrice,
        currency: item.currency,
        payment_method: item.paymentMethod,
        created_at: item.createdAt.toISOString(),
        first_item_name: item.firstItemName,
        quantity: item.quantity,
      })),
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }
}
