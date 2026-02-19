import { OrderListStatusGroup } from '../order-list-status-group';
import { CouponRow, VolumeTierRow } from '../order-pricing';
import { CreatedOrderEntity } from '../entities/created-order.entity';
import { OrderDetailEntity } from '../entities/order-detail.entity';
import { OrderListItemEntity } from '../entities/order-list-item.entity';
import { OrderPaymentEntity } from '../entities/order-payment.entity';
import { PendingOrderEntity } from '../entities/pending-order.entity';
import { VariantForOrderRow } from '../entities/variant-for-order.entity';

export interface ListTelegramOrdersParams {
  userId: number;
  page: number;
  limit: number;
  statusGroup?: OrderListStatusGroup;
}

export interface ListTelegramOrdersResult {
  items: OrderListItemEntity[];
  total: number;
}

export interface CreateTelegramOrderParams {
  userId: number;
  variant: VariantForOrderRow;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: 'USDT' | 'VND';
  paymentMethod: string;
  snapshotVariantName: string;
  couponId?: number | null;
  userCouponId?: number | null;
}

export interface ExpireTimedPendingOrdersResult {
  cancelledCount: number;
}

export interface PayWithBalanceResult {
  deliveryLines: string[];
}

export interface OrderRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  findActiveVariantById(variantId: number): Promise<VariantForOrderRow | null>;
  countAvailableStock(variantId: number): Promise<number>;
  listActiveVolumeTiers(variantId: number): Promise<VolumeTierRow[]>;
  findCouponByCode(code: string): Promise<CouponRow | null>;
  countCouponRedemptions(
    couponId: number,
    userId: number,
    statuses: readonly string[],
  ): Promise<{ total: number; perUser: number }>;
  findActivePendingOrder(userId: number): Promise<PendingOrderEntity | null>;
  cancelPendingOrder(userId: number, orderId: string): Promise<boolean>;
  /** Hủy batch đơn PENDING BINANCE/CRYPTO/BANK quá PENDING_PAYMENT_TIMEOUT_MS; trả stock RESERVED → AVAILABLE. */
  expireTimedPendingOrders(batchSize?: number): Promise<ExpireTimedPendingOrdersResult>;
  createTelegramPendingOrder(params: CreateTelegramOrderParams): Promise<CreatedOrderEntity>;
  findOrderPaymentForTelegram(orderId: string, telegramId: number): Promise<OrderPaymentEntity | null>;
  listPendingBinanceOrders(): Promise<OrderPaymentEntity[]>;
  listPendingBankOrders(): Promise<OrderPaymentEntity[]>;
  confirmOrderPaidByPaymentCode(
    orderId: string,
    paymentMethod: 'BINANCE' | 'BANK',
  ): Promise<boolean>;
  deliverInStockOrder(orderId: string): Promise<string[] | null>;
  findOrderDeliveryLines(orderId: string): Promise<string[]>;
  /**
   * Trừ balance, chuyển PENDING → PAID → DELIVERED trong một transaction.
   * Throw ApiException với code `insufficient_balance_usdt` / `insufficient_balance_vnd` nếu không đủ số dư.
   */
  payWithBalance(
    orderId: string,
    userId: number,
    paymentMethod: 'BALANCE' | 'BALANCE_VND',
  ): Promise<PayWithBalanceResult>;
  listTelegramOrdersByUserId(params: ListTelegramOrdersParams): Promise<ListTelegramOrdersResult>;
  findTelegramOrderDetail(orderId: string, userId: number): Promise<OrderDetailEntity | null>;
}
