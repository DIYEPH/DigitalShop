export interface TelegramProductListItemEntity {
  id: number;
  categoryId: number;
  nameEn: string;
  nameVi: string;
  minPriceVnd: number | null;
  minPriceUsdt: number | null;
  stockCount: number;
}
