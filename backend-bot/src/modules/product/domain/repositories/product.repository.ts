import { TelegramProductDetailEntity } from '../entities/product-detail.entity';
import { TelegramProductListItemEntity } from '../entities/product-list-item.entity';

export interface ProductRepository {
  listTelegramProducts(
    shopId: string,
    categoryId: number | null,
    page: number,
    limit: number,
  ): Promise<{ items: TelegramProductListItemEntity[]; total: number }>;
  findTelegramProductDetailById(
    shopId: string,
    productId: number,
  ): Promise<TelegramProductDetailEntity | null>;
}
