export interface PendingOrderEntity {
  orderId: string;
  paymentCode: string | null;
  status: string;
  paymentMethod: string;
  currency: string;
  totalPrice: number;
  createdAt: Date;
  quantity: number;
  itemName: string;
}
