export interface OrderPaymentEntity {
  orderId: string;
  status: string;
  paymentMethod: string;
  currency: string;
  totalPrice: number;
  paymentCode: string | null;
  createdAt: Date;
  txId: string | null;
}
