import { Inject, Injectable } from '@nestjs/common';
import { COUPON_REPOSITORY } from '../../coupon.tokens';
import { CouponRepository } from '../../domain/repositories/coupon.repository';

export interface ShopCouponItemDto {
  code: string;
  variant_id: number;
  product_name: string;
  variant_name: string;
  discount_type: string;
  discount_percent: number | null;
  discount_amount_usdt: number | null;
  discount_amount_vnd: number | null;
  cost_point: number;
}

@Injectable()
export class ListTelegramCouponShopUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
  ) {}

  async execute(): Promise<{ items: ShopCouponItemDto[] }> {
    const rows = await this.couponRepository.listShopCoupons();
    return {
      items: rows.map((row) => ({
        code: row.coupon.code,
        variant_id: row.coupon.variantId,
        product_name: row.productNameEn || row.productNameVi,
        variant_name: row.variantNameEn || row.variantNameVi,
        discount_type: row.coupon.discountType,
        discount_percent:
          row.coupon.discountType === 'PERCENT' && row.coupon.percentBps != null
            ? row.coupon.percentBps / 100
            : null,
        discount_amount_usdt: row.coupon.amountUsdt,
        discount_amount_vnd: row.coupon.amountVnd,
        cost_point: row.coupon.costPoint ?? 0,
      })),
    };
  }
}
