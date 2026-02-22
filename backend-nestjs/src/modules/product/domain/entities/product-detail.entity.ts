export interface TelegramProductVariantEntity {
  id: number;
  planId: number | null;
  planNameEn: string | null;
  planNameVi: string | null;
  nameEn: string;
  nameVi: string;
  fulfillmentType: string;
  isActive: boolean;
  paymentMethods: string[];
  amountVnd: number;
  amountUsdt: number;
  stockCount: number;
}

export interface TelegramProductDetailEntity {
  id: number;
  categoryId: number;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  descriptionVi: string;
  variants: TelegramProductVariantEntity[];
}
