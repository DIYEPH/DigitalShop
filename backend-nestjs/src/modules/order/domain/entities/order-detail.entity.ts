export interface OrderDetailItemEntity {
  variantId: number;
  quantity: number;
  unitPrice: number;
  snapshotVariantName: string;
  snapshotFulfillmentType: string;
}

export interface OrderDetailEntity {
  orderId: string;
  status: string;
  totalPrice: number;
  currency: string;
  paymentMethod: string;
  paymentCode: string | null;
  createdAt: Date;
  paidAt: Date | null;
  deliveredAt: Date | null;
  items: OrderDetailItemEntity[];
  deliveryLines: string[];
}
