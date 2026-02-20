import { Inject, Injectable } from '@nestjs/common';
import { TelegramProductListItemEntity } from '../../domain/entities/product-list-item.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '../../product.tokens';
import {
  TelegramProductListItemDto,
  TelegramProductListResponseDto,
} from '../dto/telegram-product-list-response.dto';

@Injectable()
export class ListTelegramProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    categoryId: number | null,
    page: number,
    limit: number,
  ): Promise<{ data: TelegramProductListResponseDto; total: number }> {
    const { items, total } = await this.productRepository.listTelegramProducts(
      categoryId,
      page,
      limit,
    );
    return {
      data: { items: items.map(mapListItemToDto) },
      total,
    };
  }
}

function mapListItemToDto(entity: TelegramProductListItemEntity): TelegramProductListItemDto {
  return {
    id: entity.id,
    category_id: entity.categoryId,
    name_en: entity.nameEn,
    name_vi: entity.nameVi,
    min_price_vnd: entity.minPriceVnd,
    min_price_usdt: entity.minPriceUsdt,
    stock_count: entity.stockCount,
  };
}
