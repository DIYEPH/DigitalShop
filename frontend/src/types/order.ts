/** Catalog và đơn hàng chỉ dùng USDT. */
export type Currency = "USDT";

export type PaymentMethod = "USDT" | "BINANCE" | "BALANCE";
export type WalletNetwork = "TRC20" | "ERC20";
export type OrderStatus = "PENDING" | "PAID" | "DELIVERED" | "CANCELLED";

export interface OrderItem {
  product_id: number;
  product_name?: string;
  variant_name?: string;
  snapshot_variant_name?: string;
  quantity: number;
  unit_price: number;
  fulfillment_type?: "IN_STOCK" | "PREORDER";
  delivered_payloads?: string[];
}

export interface OrderSummary {
  id: string;
  total_price: number;
  currency: Currency;
  payment_method: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  created_at: string;
}

export interface PendingOrder extends OrderSummary {
  expires_at: string;
  seconds_left: number;
}

export type PaymentInstruction =
  | { method: "USDT"; wallet_address: string; network: WalletNetwork; amount: number }
  | { method: "BINANCE"; binance_id?: string | null; binance_pay_id?: string | null; payment_code?: string | null; note?: string; amount: number }
  | { method: "BALANCE"; amount: number; currency: "USDT" };

export interface CreateOrderResponse {
  order: OrderSummary;
  payment: PaymentInstruction;
}

export interface CreateOrderInput {
  items: { variantId: number; quantity: number }[];
  payment_method: PaymentMethod;
  currency?: "USDT";
  network?: WalletNetwork;
  coupon_code?: string;
}

export type OrderQuoteItem = {
  variant_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  base_unit_price?: number;
  volume_min_qty?: number | null;
  volume_discount_bps?: number | null;
  volume_discount_total?: number;
};

export type OrderQuote = {
  total_price: number;
  promo_discount: number;
  voucher_discount: number;
  volume_discount?: number;
  payable: number;
  currency: Currency;
  payment_method: PaymentMethod;
  network: WalletNetwork | null;
  items?: OrderQuoteItem[];
};
