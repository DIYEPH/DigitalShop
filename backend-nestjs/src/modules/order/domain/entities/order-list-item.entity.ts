export interface OrderListItemEntity {
  orderId: string;
  status: string;
  totalPrice: number;
  currency: string;
  paymentMethod: string;
  createdAt: Date;
  firstItemName: string;
  quantity: number;
}
