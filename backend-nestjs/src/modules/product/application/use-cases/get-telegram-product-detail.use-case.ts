import { Inject, Injectable } from '@nestjs/common';
import { filterPaymentMethodsForBank } from '../../../../integration/bank/bank-checkout';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
import { TelegramProductDetailEntity } from '../../domain/entities/product-detail.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '../../product.tokens';
import { TelegramProductDetailResponseDto } from '../dto/telegram-product-detail-response.dto';

@Injectable()
export class GetTelegramProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(productId: number): Promise<TelegramProductDetailResponseDto | null> {
    const entity = await this.productRepository.findTelegramProductDetailById(productId);
    if (!entity) return null;
    return mapProductDetailToDto(entity, this.sepayGateway);
  }
}

function mapProductDetailToDto(
  entity: TelegramProductDetailEntity,
  sepayGateway: SepayGateway,
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
      payment_methods: filterPaymentMethodsForBank(v.paymentMethods, sepayGateway),
      amount_vnd: v.amountVnd,
      amount_usdt: v.amountUsdt,
      stock_count: v.stockCount,
    })),
  };
}
