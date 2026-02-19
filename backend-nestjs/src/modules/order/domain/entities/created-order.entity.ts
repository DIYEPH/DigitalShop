export interface CreatedOrderEntity {
  id: string;
  paymentCode: string | null;
  status: string;
  paymentMethod: string;
  currency: string;
  totalPrice: number;
  createdAt: Date;
}
