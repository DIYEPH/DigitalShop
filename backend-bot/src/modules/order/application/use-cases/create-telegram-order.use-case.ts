import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { mapPendingOrderResponse } from '../helpers/map-pending-order-response';
import {
  assertPaymentMethodAllowed,
  buildOrderExpiry,
  currencyForPaymentMethod,
  totalPriceForPaymentMethod,
  unitPriceForPaymentMethod,
} from '../../domain/order-pricing';
import { COUPON_REPOSITORY } from '../../../coupon/coupon.tokens';
import { CouponRepository } from '../../../coupon/domain/repositories/coupon.repository';
import { buildTelegramOrderLinePricing } from '../helpers/build-telegram-order-pricing';
import { assertBankCheckoutConfigured } from '../../../../integration/bank/bank-checkout';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '../../order.tokens';
import {
  TelegramOrderCreateDto,
  TelegramOrderCreateResponseDto,
} from '../dto/telegram-order-create.dto';
@Injectable()
export class CreateTelegramOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(
    shopId: string,
    input: TelegramOrderCreateDto,
  ): Promise<TelegramOrderCreateResponseDto> {
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiException('invalid_quantity', 'Quantity must be at least 1.', 400);
    }

    const userId = await this.orderRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const variant = await this.orderRepository.findActiveVariantById(
      shopId,
      Number(input.variant_id),
    );
    if (!variant) {
      throw new ApiException('variant_not_found', 'Variant not found or inactive.', 404);
    }

    if (!variant.amountUsdt || variant.amountUsdt <= 0 || !variant.amountVnd || variant.amountVnd <= 0) {
      throw new ApiException('variant_not_found', 'Variant has no valid price.', 404);
    }

    assertPaymentMethodAllowed(input.payment_method, variant.paymentMethods);

    if (input.payment_method === 'BANK') {
      assertBankCheckoutConfigured(await this.shopGateways.getSepay(shopId));
    }
    if (input.payment_method === 'BINANCE') {
      const binance = await this.shopGateways.getBinance(shopId);
      if (!binance) {
        throw new ApiException(
          'binance_not_configured',
          'Binance Pay is not configured for this shop.',
          400,
        );
      }
    }

    const existingPending = await this.orderRepository.findActivePendingOrder(shopId, userId);
    if (existingPending) {
      throw new ApiException(
        'pending_order_exists',
        'You already have a pending order. Complete or cancel it first.',
        409,
        { order: mapPendingOrderResponse(existingPending) },
      );
    }

    if (variant.fulfillmentType === 'IN_STOCK') {
      const stockAvailable = await this.orderRepository.countAvailableStock(variant.id);
      if (stockAvailable < quantity) {
        throw new ApiException('insufficient_stock', 'Not enough stock for this quantity.', 400);
      }
    }

    const { resolved, pricing } = await buildTelegramOrderLinePricing(
      this.orderRepository,
      this.couponRepository,
      shopId,
      variant,
      quantity,
      userId,
      {
        couponCode: input.coupon_code,
        userCouponId: input.user_coupon_id,
      },
    );
    const coupon = resolved?.coupon ?? null;

    const currency = currencyForPaymentMethod(input.payment_method);
    const totalPrice = totalPriceForPaymentMethod(pricing, input.payment_method);
    const unitPrice = unitPriceForPaymentMethod(pricing, input.payment_method);
    const created = await this.orderRepository.createTelegramPendingOrder({
      shopId,
      userId,
      variant,
      quantity,
      unitPrice,
      totalPrice,
      currency,
      paymentMethod: input.payment_method,
      snapshotVariantName: variant.nameVi,
      couponId: coupon?.id ?? null,
      userCouponId: resolved?.userCouponId ?? null,
    });

    if (input.payment_method === 'BALANCE' || input.payment_method === 'BALANCE_VND') {
      let paid: { deliveryLines: string[] };
      try {
        paid = await this.orderRepository.payWithBalance(
          shopId,
          created.id,
          userId,
          input.payment_method,
        );
      } catch (err) {
        await this.orderRepository.cancelPendingOrder(shopId, userId, created.id).catch(() => {});
        throw err;
      }
      return {
        order_id: created.id,
        payment_code: null,
        status: 'DELIVERED',
        payment_method: created.paymentMethod,
        currency: created.currency,
        total_price: Number(created.totalPrice),
        expires_at: null,
        seconds_left: null,
        delivery_lines: paid.deliveryLines,
      };
    }

    const expiry = buildOrderExpiry(created.createdAt, input.payment_method);

    return {
      order_id: created.id,
      payment_code: created.paymentCode ?? null,
      status: created.status,
      payment_method: created.paymentMethod,
      currency: created.currency,
      total_price: Number(created.totalPrice),
      expires_at: expiry.expiresAt,
      seconds_left: expiry.secondsLeft,
      delivery_lines: null,
    };
  }
}
