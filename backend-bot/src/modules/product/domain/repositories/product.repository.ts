import { TelegramProductDetailEntity } from '../entities/product-detail.entity';
import { TelegramProductListItemEntity } from '../entities/product-list-item.entity';

export interface ProductRepository {
  listTelegramProducts(
    categoryId: number | null,
    page: number,
    limit: number,
  ): Promise<{ items: TelegramProductListItemEntity[]; total: number }>;
  findTelegramProductDetailById(
    productId: number,
  ): Promise<TelegramProductDetailEntity | null>;
}
