export interface TelegramProductListItemDto {
  id: number;
  category_id: number;
  name_en: string;
  name_vi: string;
  min_price_vnd: number | null;
  min_price_usdt: number | null;
  stock_count: number;
}

export interface TelegramProductListResponseDto {
  items: TelegramProductListItemDto[];
}
