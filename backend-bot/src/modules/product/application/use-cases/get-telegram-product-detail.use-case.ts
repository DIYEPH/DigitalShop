import { Inject, Injectable } from '@nestjs/common';
import { filterPaymentMethodsForShop } from '../../../../integration/bank/bank-checkout';
import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { TelegramProductDetailEntity } from '../../domain/entities/product-detail.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '../../product.tokens';
import { TelegramProductDetailResponseDto } from '../dto/telegram-product-detail-response.dto';

@Injectable()
export class GetTelegramProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(
    shopId: string,
    productId: number,
  ): Promise<TelegramProductDetailResponseDto | null> {
    const entity = await this.productRepository.findTelegramProductDetailById(shopId, productId);
    if (!entity) return null;
    const [sepay, binance] = await Promise.all([
      this.shopGateways.getSepay(shopId),
      this.shopGateways.getBinance(shopId),
    ]);
    return mapProductDetailToDto(entity, sepay, binance);
  }
}

function mapProductDetailToDto(
  entity: TelegramProductDetailEntity,
  sepay: SepayGateway | null,
  binance: BinancePayGateway | null,
): TelegramProductDetailResponseDto {
  return {
    id: entity.id,
    category_id: entity.categoryId,
    name_en: entity.nameEn,
    name_vi: entity.nameVi,
    description_en: entity.descriptionEn,
    description_vi: entity.descriptionVi,
    variants: entity.variants.map((v) => ({
      id: v.id,
      plan_id: v.planId,
      plan_name_en: v.planNameEn,
      plan_name_vi: v.planNameVi,
      name_en: v.nameEn,
      name_vi: v.nameVi,
      fulfillment_type: v.fulfillmentType,
      is_active: v.isActive,
      payment_methods: filterPaymentMethodsForShop(v.paymentMethods, { sepay, binance }),
      amount_vnd: v.amountVnd,
      amount_usdt: v.amountUsdt,
      stock_count: v.stockCount,
    })),
  };
}
