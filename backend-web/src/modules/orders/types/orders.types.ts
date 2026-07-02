export type StorefrontPaymentMethod = 'USDT' | 'BINANCE' | 'BALANCE';
export type DbPaymentMethod = 'CRYPTO' | 'BINANCE' | 'BALANCE';
export type OrderStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED';
export type Currency = 'USDT';
export type WalletNetwork = 'TRC20' | 'ERC20' | 'BSC';
export type FulfillmentType = 'IN_STOCK' | 'PREORDER';
export type WarrantyType = 'LOGIN' | 'CUSTOM' | 'NONE';
export type WarrantyUnit = 'HOUR' | 'DAY' | 'MONTH' | 'YEAR';
export type OrderMessageKind = 'TEXT' | 'WARRANTY_REQUEST' | 'SYSTEM';
export type WarrantyRequestStatus = 'OPEN' | 'REPLACED' | 'REFUNDED' | 'REJECTED';

export type WarrantyRequestInfo = {
  status: WarrantyRequestStatus;
  days_used: number | null;
  resolution_note: string | null;
  created_at: string;
};

export type WarrantyInfo = {
  warranty_type: WarrantyType;
  warranty_expires_at: string | null;
  can_request_warranty: boolean;
  request: WarrantyRequestInfo | null;
};

export type OrderMessage = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number | null;
  sender_role: 'ADMIN' | 'USER';
  kind: OrderMessageKind;
  message: string;
  created_at: string;
};

export type OrderQuoteItem = {
  variant_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  base_unit_price: number;
  volume_min_qty: number | null;
  volume_discount_bps: number | null;
  volume_discount_total: number;
};

export type OrderQuote = {
  total_price: number;
  promo_discount: number;
  voucher_discount: number;
  volume_discount: number;
  payable: number;
  currency: Currency;
  payment_method: StorefrontPaymentMethod;
  network: WalletNetwork | null;
  items: OrderQuoteItem[];
};

export type OrderSummaryItem = {
  product_id: number;
  product_name?: string;
  variant_name?: string;
  snapshot_variant_name?: string;
  quantity: number;
  unit_price: number;
  fulfillment_type?: FulfillmentType;
  delivered_payloads?: string[];
};

export type OrderSummary = {
  id: string;
  total_price: number;
  currency: Currency;
  payment_method: StorefrontPaymentMethod;
  status: OrderStatus;
  items: OrderSummaryItem[];
  created_at: string;
};

export type PendingOrder = OrderSummary & {
  expires_at: string | null;
  seconds_left: number | null;
};

export type PaymentInstruction =
  | { method: 'USDT'; wallet_address: string; network: WalletNetwork; amount: number }
  | {
      method: 'BINANCE';
      binance_id?: string | null;
      binance_pay_id?: string | null;
      qr_url?: string | null;
      payment_code?: string | null;
      note?: string;
      amount: number;
    }
  | { method: 'BALANCE'; amount: number; currency: Currency };

export type CreateOrderResponse = {
  order: OrderSummary;
  payment: PaymentInstruction;
};

export type OrderDetails = {
  id: string;
  total_price: number;
  currency: Currency;
  payment_method: StorefrontPaymentMethod;
  status: OrderStatus;
  delivery_note: string | null;
  expires_at: string | null;
  seconds_left: number | null;
  items: Array<{
    order_item_id: number;
    variant_id: number;
    product_id: number;
    product_name?: string;
    snapshot_variant_name: string;
    quantity: number;
    unit_price: number;
    fulfillment_type: FulfillmentType;
    delivered_payloads?: string[];
    warranty?: WarrantyInfo;
  }>;
  created_at: string;
  updated_at: string;
};
