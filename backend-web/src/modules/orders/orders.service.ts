import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { getPgPool } from '../../common/database/pg-pool';
import { OrderCheckoutDto } from './dto/orders.dto';
import {
  CreateOrderResponse,
  DbPaymentMethod,
  FulfillmentType,
  OrderDetails,
  OrderQuote,
  OrderQuoteItem,
  OrderSummary,
  PaymentInstruction,
  PendingOrder,
  StorefrontPaymentMethod,
  WalletNetwork,
} from './types/orders.types';
import {
  allowedDbPaymentMethods,
  buildOrderExpiry,
  generatePaymentCode,
  normalizeNetwork,
  paymentMethodToApi,
  paymentMethodToDb,
  roundUsdt,
  toIso,
  toNumber,
} from './utils/orders-mapper';

type VariantRow = {
  id: number;
  product_id: number;
  product_name_en: string;
  product_name_vi: string;
  name_en: string;
  name_vi: string;
  fulfillment_type: FulfillmentType;
  preorder_limit: number | null;
  warranty_type: string;
  warranty_value: number | null;
  warranty_unit: string | null;
  amount_usdt: string;
  payment_methods: unknown;
};

type VolumeTierRow = {
  variant_id: number;
  min_quantity: number;
  discount_bps: number;
};

type QuoteLine = {
  variant: VariantRow;
  quantity: number;
  baseUnitPrice: number;
  unitPrice: number;
  lineTotal: number;
  volumeMinQty: number | null;
  volumeDiscountBps: number | null;
  volumeDiscountTotal: number;
};

type OrderRow = {
  id: string;
  total_price: string;
  currency: string;
  payment_method: string;
  payment_code: string | null;
  status: 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELLED';
  delivery_note: string | null;
  created_at: Date;
  updated_at: Date;
};

type OrderItemJson = {
  order_item_id: number;
  variant_id: number;
  product_id: number;
  product_name: string;
  snapshot_variant_name: string;
  quantity: number;
  unit_price: number | string;
  fulfillment_type: FulfillmentType;
  delivered_payloads?: string[];
};

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class OrdersService {
  private get pool(): Pool {
    return getPgPool();
  }

  constructor(private readonly config: ConfigService) {}

  async quote(userId: number, dto: OrderCheckoutDto): Promise<OrderQuote> {
    await this.assertUserExists(userId);
    if (dto.coupon_code?.trim()) {
      throw new BadRequestException('Coupon code is not supported by backend-web orders yet');
    }

    const dbPaymentMethod = paymentMethodToDb(dto.payment_method);
    const lines = await this.buildQuoteLines(dto, dbPaymentMethod);
    return this.mapQuote(lines, dto.payment_method, normalizeNetwork(dto.network));
  }

  async create(userId: number, dto: OrderCheckoutDto): Promise<CreateOrderResponse> {
    const dbPaymentMethod = paymentMethodToDb(dto.payment_method);
    const existing = await this.getActivePendingOrder(userId);
    if (existing) {
      throw new ConflictException('You already have a pending order. Complete or cancel it first.');
    }

    if (dto.coupon_code?.trim()) {
      throw new BadRequestException('Coupon code is not supported by backend-web orders yet');
    }

    const lines = await this.buildQuoteLines(dto, dbPaymentMethod);
    const quote = this.mapQuote(lines, dto.payment_method, normalizeNetwork(dto.network));
    const order = await this.createOrderInTransaction(userId, dbPaymentMethod, lines, quote.payable);
    const summary = await this.getOrderSummaryById(userId, order.id);

    if (!summary) {
      throw new NotFoundException('Order not found after creation');
    }

    return {
      order: summary,
      payment: this.buildPaymentInstruction(order, dto.payment_method, normalizeNetwork(dto.network)),
    };
  }

  async list(
    userId: number,
    query: { page?: number; limit?: number; status?: string },
  ): Promise<{ orders: OrderSummary[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [userId, limit, offset];
    const statusFilter = query.status ? 'AND o.status = $4::order_status_enum' : '';
    if (query.status) params.push(query.status);

    const result = await this.pool.query<OrderRow & { items: unknown; total_count: string }>(
      `SELECT o.id::text, o.total_price, o.currency::text, o.payment_method::text, o.payment_code,
              o.status::text AS status, o.delivery_note, o.created_at, o.updated_at,
              COUNT(*) OVER()::text AS total_count,
              ${this.itemsJsonSql()} AS items
       FROM orders o
       WHERE o.user_id = $1 ${statusFilter}
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    );

    const total = toNumber(result.rows[0]?.total_count);
    return {
      orders: result.rows.map((row) => this.mapSummary(row, this.parseItems(row.items))),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getActivePendingOrder(userId: number): Promise<PendingOrder | null> {
    const result = await this.pool.query<OrderRow & { items: unknown }>(
      `SELECT o.id::text, o.total_price, o.currency::text, o.payment_method::text, o.payment_code,
              o.status::text AS status, o.delivery_note, o.created_at, o.updated_at,
              ${this.itemsJsonSql()} AS items
       FROM orders o
       WHERE o.user_id = $1 AND o.status = 'PENDING'
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [userId],
    );

    const row = result.rows[0];
    if (!row) return null;

    const expiry = buildOrderExpiry(row.created_at, row.payment_method);
    if ((expiry.seconds_left ?? 1) <= 0) {
      await this.cancel(userId, row.id);
      return null;
    }

    return {
      ...this.mapSummary(row, this.parseItems(row.items)),
      expires_at: expiry.expires_at,
      seconds_left: expiry.seconds_left,
    };
  }

  async getDetails(userId: number, orderId: string): Promise<OrderDetails> {
    const row = await this.findOrderRow(userId, orderId);
    const items = await this.getDetailItems(orderId, row.status);
    const expiry = buildOrderExpiry(row.created_at, row.payment_method);

    return {
      id: row.id,
      total_price: toNumber(row.total_price),
      currency: 'USDT',
      payment_method: paymentMethodToApi(row.payment_method),
      status: row.status,
      delivery_note: row.delivery_note,
      expires_at: row.status === 'PENDING' ? expiry.expires_at : null,
      seconds_left: row.status === 'PENDING' ? expiry.seconds_left : null,
      items,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    };
  }

  async getPayment(userId: number, orderId: string): Promise<{ order: Omit<OrderSummary, 'items' | 'created_at'>; payment: PaymentInstruction }> {
    const row = await this.findOrderRow(userId, orderId);
    const method = paymentMethodToApi(row.payment_method);

    return {
      order: {
        id: row.id,
        total_price: toNumber(row.total_price),
        currency: 'USDT',
        payment_method: method,
        status: row.status,
      },
      payment: this.buildPaymentInstruction(row, method, 'TRC20'),
    };
  }

  async cancel(userId: number, orderId: string): Promise<{ id: string; status: 'CANCELLED' }> {
    const result = await this.pool.query<{ id: string }>(
      `WITH cancel AS (
          UPDATE orders
          SET status = 'CANCELLED', updated_at = NOW()
          WHERE id = $1::uuid AND user_id = $2 AND status = 'PENDING'
          RETURNING id
        ),
        release AS (
          UPDATE stock_items
          SET status = 'AVAILABLE',
              is_locked = false,
              order_id = NULL,
              reserved_at = NULL,
              updated_at = NOW()
          FROM cancel
          WHERE stock_items.order_id = cancel.id AND stock_items.status = 'RESERVED'
        )
        SELECT id::text FROM cancel`,
      [orderId, userId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Pending order not found');
    }

    return { id: result.rows[0].id, status: 'CANCELLED' };
  }

  private async assertUserExists(userId: number): Promise<void> {
    const result = await this.pool.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 AND role = 'USER' AND status = 'ACTIVE' LIMIT 1`,
      [userId],
    );
    if (!result.rows[0]) throw new NotFoundException('User not found');
  }

  private async buildQuoteLines(dto: OrderCheckoutDto, dbPaymentMethod: DbPaymentMethod): Promise<QuoteLine[]> {
    const mergedItems = this.mergeItems(dto.items);
    const variantIds = mergedItems.map((item) => item.variantId);
    const variants = await this.loadVariants(variantIds);
    const tiers = await this.loadVolumeTiers(variantIds);
    const lines: QuoteLine[] = [];

    for (const item of mergedItems) {
      const variant = variants.get(item.variantId);
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found or inactive`);

      const allowedMethods = allowedDbPaymentMethods(variant.payment_methods);
      if (!allowedMethods.includes(dbPaymentMethod)) {
        throw new BadRequestException('Payment method is not allowed for this variant');
      }

      await this.assertAvailability(variant, item.quantity);

      const baseUnitPrice = toNumber(variant.amount_usdt);
      const bestTier = this.pickBestTier(tiers.get(variant.id) ?? [], item.quantity);
      const unitPrice = roundUsdt(baseUnitPrice * (1 - (bestTier?.discount_bps ?? 0) / 10_000));
      const lineTotal = roundUsdt(unitPrice * item.quantity);
      const baseTotal = roundUsdt(baseUnitPrice * item.quantity);

      lines.push({
        variant,
        quantity: item.quantity,
        baseUnitPrice,
        unitPrice,
        lineTotal,
        volumeMinQty: bestTier?.min_quantity ?? null,
        volumeDiscountBps: bestTier?.discount_bps ?? null,
        volumeDiscountTotal: roundUsdt(baseTotal - lineTotal),
      });
    }

    return lines;
  }

  private mergeItems(items: OrderCheckoutDto['items']): Array<{ variantId: number; quantity: number }> {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.variantId, (map.get(item.variantId) ?? 0) + item.quantity);
    }
    return Array.from(map, ([variantId, quantity]) => ({ variantId, quantity }));
  }

  private async loadVariants(variantIds: number[]): Promise<Map<number, VariantRow>> {
    const result = await this.pool.query<VariantRow>(
      `SELECT v.id, v.product_id, p.name_en AS product_name_en, p.name_vi AS product_name_vi,
              v.name_en, v.name_vi, v.fulfillment_type::text AS fulfillment_type,
              v.preorder_limit, v.warranty_type::text AS warranty_type,
              v.warranty_value, v.warranty_unit::text AS warranty_unit,
              v.amount_usdt, v.payment_methods
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       INNER JOIN categories c ON c.id = p.category_id AND c.is_active = TRUE
       WHERE v.id = ANY($1::int[]) AND v.is_active = TRUE`,
      [variantIds],
    );
    return new Map(result.rows.map((row) => [Number(row.id), row]));
  }

  private async loadVolumeTiers(variantIds: number[]): Promise<Map<number, VolumeTierRow[]>> {
    const result = await this.pool.query<VolumeTierRow>(
      `SELECT variant_id, min_quantity, discount_bps
       FROM variant_volume_tiers
       WHERE variant_id = ANY($1::int[]) AND is_active = TRUE
       ORDER BY min_quantity ASC`,
      [variantIds],
    );
    const map = new Map<number, VolumeTierRow[]>();
    for (const row of result.rows) {
      const list = map.get(row.variant_id) ?? [];
      list.push(row);
      map.set(row.variant_id, list);
    }
    return map;
  }

  private pickBestTier(tiers: VolumeTierRow[], quantity: number): VolumeTierRow | null {
    let best: VolumeTierRow | null = null;
    for (const tier of tiers) {
      if (quantity >= tier.min_quantity && (!best || tier.min_quantity > best.min_quantity)) {
        best = tier;
      }
    }
    return best;
  }

  private async assertAvailability(variant: VariantRow, quantity: number): Promise<void> {
    if (variant.fulfillment_type === 'IN_STOCK') {
      const stock = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM stock_items
         WHERE variant_id = $1 AND status = 'AVAILABLE' AND is_locked = false`,
        [variant.id],
      );
      if (toNumber(stock.rows[0]?.count) < quantity) {
        throw new BadRequestException('Not enough stock for this quantity');
      }
      return;
    }

    if (variant.preorder_limit != null) {
      const sold = await this.pool.query<{ sold: string }>(
        `SELECT COALESCE(SUM(oi.quantity), 0)::text AS sold
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE oi.variant_id = $1 AND o.status IN ('PENDING', 'PAID', 'DELIVERED')`,
        [variant.id],
      );
      if (toNumber(sold.rows[0]?.sold) + quantity > variant.preorder_limit) {
        throw new BadRequestException('Preorder limit exceeded for this variant');
      }
    }
  }

  private mapQuote(lines: QuoteLine[], paymentMethod: StorefrontPaymentMethod, network: WalletNetwork): OrderQuote {
    const totalBeforeDiscount = roundUsdt(lines.reduce((sum, line) => sum + line.baseUnitPrice * line.quantity, 0));
    const volumeDiscount = roundUsdt(lines.reduce((sum, line) => sum + line.volumeDiscountTotal, 0));
    const payable = roundUsdt(lines.reduce((sum, line) => sum + line.lineTotal, 0));

    return {
      total_price: totalBeforeDiscount,
      promo_discount: 0,
      voucher_discount: 0,
      volume_discount: volumeDiscount,
      payable,
      currency: 'USDT',
      payment_method: paymentMethod,
      network: paymentMethod === 'USDT' ? network : null,
      items: lines.map<OrderQuoteItem>((line) => ({
        variant_id: line.variant.id,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
        base_unit_price: line.baseUnitPrice,
        volume_min_qty: line.volumeMinQty,
        volume_discount_bps: line.volumeDiscountBps,
        volume_discount_total: line.volumeDiscountTotal,
      })),
    };
  }

  private async createOrderInTransaction(
    userId: number,
    dbPaymentMethod: DbPaymentMethod,
    lines: QuoteLine[],
    totalPrice: number,
  ): Promise<OrderRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await this.assertActiveUserForUpdate(client, userId);
      await this.assertNoActivePendingOrderForUpdate(client, userId);

      await this.lockVariantsForUpdate(client, lines.map((line) => line.variant.id));

      for (const line of lines) {
        await this.assertVariantAvailabilityForUpdate(client, line.variant, line.quantity);
      }

      const order = await this.insertOrder(client, userId, dbPaymentMethod, totalPrice);

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items (
              order_id, variant_id, quantity, unit_price, snapshot_variant_name,
              snapshot_fulfillment_type, snapshot_warranty_type, snapshot_warranty_value, snapshot_warranty_unit
            )
            VALUES ($1, $2, $3, $4, $5, $6::fulfillment_type_enum, $7::warranty_type_enum, $8, $9::warranty_unit_enum)`,
          [
            order.id,
            line.variant.id,
            line.quantity,
            line.unitPrice,
            line.variant.name_en,
            line.variant.fulfillment_type,
            line.variant.warranty_type,
            line.variant.warranty_value,
            line.variant.warranty_unit,
          ],
        );

        if (line.variant.fulfillment_type === 'IN_STOCK') {
          await this.reserveStock(client, order.id, line.variant.id, line.quantity);
        }
      }

      if (dbPaymentMethod === 'BALANCE') {
        await this.payWithBalance(client, userId, order.id, totalPrice);
      }

      await client.query('COMMIT');

      const created = await this.findOrderRow(userId, order.id);
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertVariantAvailabilityForUpdate(client: PoolClient, variant: VariantRow, quantity: number): Promise<void> {
    if (variant.fulfillment_type === 'PREORDER') {
      if (variant.preorder_limit == null) return;
      const sold = await client.query<{ sold: string }>(
        `SELECT COALESCE(SUM(oi.quantity), 0)::text AS sold
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         WHERE oi.variant_id = $1 AND o.status IN ('PENDING', 'PAID', 'DELIVERED')`,
        [variant.id],
      );
      if (toNumber(sold.rows[0]?.sold) + quantity > variant.preorder_limit) {
        throw new BadRequestException('Preorder limit exceeded for this variant');
      }
    }
  }

  private async assertActiveUserForUpdate(client: PoolClient, userId: number): Promise<void> {
    const result = await client.query<{ id: number }>(
      `SELECT id
       FROM users
       WHERE id = $1 AND role = 'USER' AND status = 'ACTIVE'
       FOR UPDATE`,
      [userId],
    );
    if (!result.rows[0]) throw new NotFoundException('User not found');
  }

  private async assertNoActivePendingOrderForUpdate(client: PoolClient, userId: number): Promise<void> {
    const result = await client.query<{ id: string }>(
      `SELECT id::text
       FROM orders
       WHERE user_id = $1 AND status = 'PENDING'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId],
    );
    if (result.rows[0]) {
      throw new ConflictException('You already have a pending order. Complete or cancel it first.');
    }
  }

  private async lockVariantsForUpdate(client: PoolClient, variantIds: number[]): Promise<void> {
    const sortedIds = Array.from(new Set(variantIds)).sort((a, b) => a - b);
    await client.query(
      `SELECT id
       FROM product_variants
       WHERE id = ANY($1::int[])
       ORDER BY id ASC
       FOR UPDATE`,
      [sortedIds],
    );
  }

  private async insertOrder(
    client: PoolClient,
    userId: number,
    paymentMethod: DbPaymentMethod,
    totalPrice: number,
  ): Promise<OrderRow> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const paymentCode = paymentMethod === 'BINANCE' ? generatePaymentCode() : null;
      try {
        const result = await client.query<OrderRow>(
          `INSERT INTO orders (user_id, payment_code, total_price, currency, payment_method, coupon_id, status)
           VALUES ($1, $2, $3, 'USDT'::currency_enum, $4::product_payment_method_enum, NULL, 'PENDING')
           RETURNING id::text, total_price, currency::text, payment_method::text, payment_code,
                     status::text AS status, delivery_note, created_at, updated_at`,
          [userId, paymentCode, totalPrice, paymentMethod],
        );
        return result.rows[0];
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION && paymentMethod === 'BINANCE') continue;
        throw error;
      }
    }
    throw new ConflictException('Could not generate unique payment code');
  }

  private async reserveStock(client: PoolClient, orderId: string, variantId: number, quantity: number): Promise<void> {
    const result = await client.query(
      `WITH candidate AS (
          SELECT id
          FROM stock_items
          WHERE variant_id = $1 AND status = 'AVAILABLE' AND is_locked = false
          ORDER BY created_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE stock_items s
        SET status = 'RESERVED', is_locked = true, order_id = $3::uuid, reserved_at = NOW(), updated_at = NOW()
        FROM candidate c
        WHERE s.id = c.id
        RETURNING s.id`,
      [variantId, quantity, orderId],
    );
    if ((result.rowCount ?? 0) < quantity) throw new BadRequestException('Not enough stock for this quantity');
  }

  private async payWithBalance(client: PoolClient, userId: number, orderId: string, totalPrice: number): Promise<void> {
    const user = await client.query<{ balance_usdt: string }>(
      `SELECT balance_usdt FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    if (!user.rows[0]) throw new NotFoundException('User not found');
    if (toNumber(user.rows[0].balance_usdt) < totalPrice) throw new BadRequestException('Insufficient balance');

    await client.query(
      `UPDATE users SET balance_usdt = balance_usdt - $2::numeric, updated_at = NOW() WHERE id = $1`,
      [userId, totalPrice],
    );

    const allInStock = await client.query<{ all_in_stock: boolean }>(
      `SELECT BOOL_AND(snapshot_fulfillment_type = 'IN_STOCK') AS all_in_stock FROM order_items WHERE order_id = $1::uuid`,
      [orderId],
    );
    const nextStatus = allInStock.rows[0]?.all_in_stock ? 'DELIVERED' : 'PAID';

    if (nextStatus === 'DELIVERED') {
      await client.query(
        `UPDATE stock_items
         SET status = 'DELIVERED', is_locked = false, delivered_at = NOW(), updated_at = NOW()
         WHERE order_id = $1::uuid AND status = 'RESERVED'`,
        [orderId],
      );
    }

    await client.query(
      `UPDATE orders
       SET status = $2::order_status_enum,
           paid_at = NOW(),
           delivered_at = CASE WHEN $2 = 'DELIVERED' THEN NOW() ELSE delivered_at END,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [orderId, nextStatus],
    );
  }

  private async findOrderRow(userId: number, orderId: string): Promise<OrderRow> {
    const result = await this.pool.query<OrderRow>(
      `SELECT id::text, total_price, currency::text, payment_method::text, payment_code,
              status::text AS status, delivery_note, created_at, updated_at
       FROM orders
       WHERE id = $1::uuid AND user_id = $2
       LIMIT 1`,
      [orderId, userId],
    );
    if (!result.rows[0]) throw new NotFoundException('Order not found');
    return result.rows[0];
  }

  private async getOrderSummaryById(userId: number, orderId: string): Promise<OrderSummary | null> {
    const result = await this.pool.query<OrderRow & { items: unknown }>(
      `SELECT o.id::text, o.total_price, o.currency::text, o.payment_method::text, o.payment_code,
              o.status::text AS status, o.delivery_note, o.created_at, o.updated_at,
              ${this.itemsJsonSql()} AS items
       FROM orders o
       WHERE o.id = $1::uuid AND o.user_id = $2
       LIMIT 1`,
      [orderId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapSummary(row, this.parseItems(row.items));
  }

  private itemsJsonSql(): string {
    return `(SELECT COALESCE(
      json_agg(
        json_build_object(
          'order_item_id', oi.id,
          'variant_id', oi.variant_id,
          'product_id', pv.product_id,
          'product_name', p.name_en,
          'snapshot_variant_name', oi.snapshot_variant_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price::float8,
          'fulfillment_type', oi.snapshot_fulfillment_type::text
        )
        ORDER BY oi.id ASC
      ),
      '[]'::json
    )
    FROM order_items oi
    INNER JOIN product_variants pv ON pv.id = oi.variant_id
    INNER JOIN products p ON p.id = pv.product_id
    WHERE oi.order_id = o.id)`;
  }

  private mapSummary(row: OrderRow, items: OrderItemJson[]): OrderSummary {
    return {
      id: row.id,
      total_price: toNumber(row.total_price),
      currency: 'USDT',
      payment_method: paymentMethodToApi(row.payment_method),
      status: row.status,
      items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        variant_name: item.snapshot_variant_name,
        snapshot_variant_name: item.snapshot_variant_name,
        quantity: item.quantity,
        unit_price: toNumber(item.unit_price),
        fulfillment_type: item.fulfillment_type,
      })),
      created_at: toIso(row.created_at),
    };
  }

  private async getDetailItems(orderId: string, status: string): Promise<OrderDetails['items']> {
    const result = await this.pool.query<OrderItemJson & { delivered_payloads: unknown }>(
      `SELECT oi.id AS order_item_id, oi.variant_id, pv.product_id, p.name_en AS product_name,
              oi.snapshot_variant_name, oi.quantity, oi.unit_price::float8 AS unit_price,
              oi.snapshot_fulfillment_type::text AS fulfillment_type,
              COALESCE(
                (
                  SELECT json_agg(si.payload ORDER BY si.created_at ASC)
                  FROM stock_items si
                  WHERE si.order_id = oi.order_id
                    AND si.variant_id = oi.variant_id
                    AND si.status = 'DELIVERED'
                ),
                '[]'::json
              ) AS delivered_payloads
       FROM order_items oi
       INNER JOIN product_variants pv ON pv.id = oi.variant_id
       INNER JOIN products p ON p.id = pv.product_id
       WHERE oi.order_id = $1::uuid
       ORDER BY oi.id ASC`,
      [orderId],
    );

    return result.rows.map((row) => ({
      order_item_id: row.order_item_id,
      variant_id: row.variant_id,
      product_id: row.product_id,
      product_name: row.product_name,
      snapshot_variant_name: row.snapshot_variant_name,
      quantity: row.quantity,
      unit_price: toNumber(row.unit_price),
      fulfillment_type: row.fulfillment_type,
      delivered_payloads: status === 'DELIVERED' && Array.isArray(row.delivered_payloads)
        ? row.delivered_payloads.map(String)
        : [],
    }));
  }

  private parseItems(value: unknown): OrderItemJson[] {
    if (Array.isArray(value)) return value as OrderItemJson[];
    if (typeof value === 'string') {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as OrderItemJson[]) : [];
    }
    return [];
  }

  private buildPaymentInstruction(order: Pick<OrderRow, 'payment_method' | 'payment_code' | 'total_price'>, method: StorefrontPaymentMethod, network: WalletNetwork): PaymentInstruction {
    const amount = toNumber(order.total_price);
    if (method === 'BALANCE') {
      return { method: 'BALANCE', amount, currency: 'USDT' };
    }
    if (method === 'BINANCE') {
      return {
        method: 'BINANCE',
        binance_id: this.config.get<string>('BINANCE_PAY_ID') || null,
        binance_pay_id: this.config.get<string>('BINANCE_PAY_ID') || null,
        payment_code: order.payment_code,
        note: order.payment_code ?? undefined,
        amount,
      };
    }

    const walletAddress = this.resolveUsdtWallet(network);
    return { method: 'USDT', wallet_address: walletAddress, network, amount };
  }

  private resolveUsdtWallet(network: WalletNetwork): string {
    const key = network === 'ERC20' ? 'USDT_ERC20_WALLET_ADDRESS' : 'USDT_TRC20_WALLET_ADDRESS';
    const wallet = this.config.get<string>(key) || this.config.get<string>('USDT_WALLET_ADDRESS');
    if (!wallet) {
      throw new ServiceUnavailableException(`${key} is not configured`);
    }
    return wallet;
  }
}
