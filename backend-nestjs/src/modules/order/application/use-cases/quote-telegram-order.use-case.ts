import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { filterPaymentMethodsForBank } from '../../../../integration/bank/bank-checkout';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { COUPON_REPOSITORY } from '../../../coupon/coupon.tokens';
import { CouponRepository } from '../../../coupon/domain/repositories/coupon.repository';
import { buildTelegramOrderLinePricing } from '../helpers/build-telegram-order-pricing';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
import { ORDER_REPOSITORY } from '../../order.tokens';
import {
  TelegramOrderQuoteDto,
  TelegramOrderQuoteResponseDto,
} from '../dto/telegram-order-quote.dto';

@Injectable()
export class QuoteTelegramOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(input: TelegramOrderQuoteDto): Promise<TelegramOrderQuoteResponseDto> {
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiException('invalid_quantity', 'Quantity must be at least 1.', 400);
    }

    const userId = await this.orderRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const variant = await this.orderRepository.findActiveVariantById(Number(input.variant_id));
    if (!variant) {
      throw new ApiException('variant_not_found', 'Variant not found or inactive.', 404);
    }

    if (!variant.amountUsdt || variant.amountUsdt <= 0 || !variant.amountVnd || variant.amountVnd <= 0) {
      throw new ApiException('variant_not_found', 'Variant has no valid price.', 404);
    }

    let stockAvailable = 0;
    if (variant.fulfillmentType === 'IN_STOCK') {
      stockAvailable = await this.orderRepository.countAvailableStock(variant.id);
      if (stockAvailable < quantity) {
        throw new ApiException('insufficient_stock', 'Not enough stock for this quantity.', 400);
      }
    }

    const { pricing } = await buildTelegramOrderLinePricing(
      this.orderRepository,
      this.couponRepository,
      variant,
      quantity,
      userId,
      {
        couponCode: input.coupon_code,
        userCouponId: input.user_coupon_id,
      },
    );

    return {
      variant_id: variant.id,
      quantity,
      unit_price_usdt: pricing.unitUsdt,
      unit_price_vnd: pricing.unitVnd,
      subtotal_usdt: pricing.subtotalUsdt,
      subtotal_vnd: pricing.subtotalVnd,
      discount_usdt: pricing.discountUsdt,
      discount_vnd: pricing.discountVnd,
      total_usdt: pricing.totalUsdt,
      total_vnd: pricing.totalVnd,
      volume_tier_applied: pricing.volumeTierApplied
        ? {
            min_quantity: pricing.volumeTierApplied.minQuantity,
            discount_bps: pricing.volumeTierApplied.discountBps,
          }
        : null,
      coupon_applied: pricing.couponApplied,
      payment_methods: filterPaymentMethodsForBank(variant.paymentMethods, this.sepayGateway),
      fulfillment_type: variant.fulfillmentType,
      stock_available: stockAvailable,
    };
  }
}
