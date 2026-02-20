export interface TelegramProductVariantDto {
  id: number;
  plan_id: number | null;
  plan_name_en: string | null;
  plan_name_vi: string | null;
  name_en: string;
  name_vi: string;
  fulfillment_type: string;
  is_active: boolean;
  payment_methods: string[];
  amount_vnd: number;
  amount_usdt: number;
  stock_count: number;
}

export interface TelegramProductDetailResponseDto {
  id: number;
  category_id: number;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  variants: TelegramProductVariantDto[];
}
