import { CouponRepository } from '../../../coupon/domain/repositories/coupon.repository';
import { LinePricingResult, ResolvedOrderCoupon, computeLinePricing } from '../../domain/order-pricing';
import { VariantForOrderRow } from '../../domain/entities/variant-for-order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { ResolveOrderCouponInput, resolveOrderCoupon } from './resolve-order-coupon';

export async function buildTelegramOrderLinePricing(
  orderRepository: OrderRepository,
  couponRepository: CouponRepository,
  variant: VariantForOrderRow,
  quantity: number,
  userId: number,
  couponInput: ResolveOrderCouponInput = {},
): Promise<{ resolved: ResolvedOrderCoupon | null; pricing: LinePricingResult }> {
  const tiers = await orderRepository.listActiveVolumeTiers(variant.id);
  const resolved = await resolveOrderCoupon(
    orderRepository,
    couponRepository,
    couponInput,
    variant.id,
    userId,
  );
  const pricing = computeLinePricing({
    variantId: variant.id,
    amountUsdt: variant.amountUsdt,
    amountVnd: variant.amountVnd,
    quantity,
    tiers,
    coupon: resolved?.coupon ?? null,
    couponPrevalidated: true,
  });
  return { resolved, pricing };
}
