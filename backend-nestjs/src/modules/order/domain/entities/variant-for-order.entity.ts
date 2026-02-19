export interface VariantForOrderRow {
  id: number;
  productId: number;
  nameEn: string;
  nameVi: string;
  fulfillmentType: string;
  preorderLimit: number | null;
  warrantyType: string;
  warrantyValue: number | null;
  warrantyUnit: string | null;
  amountUsdt: number;
  amountVnd: number;
  paymentMethods: string[];
}
