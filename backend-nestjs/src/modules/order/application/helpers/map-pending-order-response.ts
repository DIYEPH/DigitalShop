import { PendingOrderEntity } from '../../domain/entities/pending-order.entity';
import { buildOrderExpiry } from '../../domain/order-pricing';
import { TelegramOrderPendingResponseDto } from '../dto/telegram-order-pending.dto';

export function mapPendingOrderResponse(
  pending: PendingOrderEntity,
): TelegramOrderPendingResponseDto {
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
