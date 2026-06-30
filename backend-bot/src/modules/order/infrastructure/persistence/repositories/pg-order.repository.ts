import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ApiException } from '../../../../../shared/errors/api.exception';
import { parsePgEnumArray } from '../../../../../shared/infrastructure/pg-enum-array';
import { CreatedOrderEntity } from '../../../domain/entities/created-order.entity';
import { OrderDetailEntity } from '../../../domain/entities/order-detail.entity';
import { OrderListItemEntity } from '../../../domain/entities/order-list-item.entity';
import { OrderPaymentEntity } from '../../../domain/entities/order-payment.entity';
import { PendingOrderEntity } from '../../../domain/entities/pending-order.entity';
import { usesPaymentCode } from '../../../domain/order-payment-fields';
import {
  buildOrderExpiry,
  PENDING_PAYMENT_TIMEOUT_MS,
  TIMED_PENDING_METHODS,
} from '../../../domain/order-pricing';
import { VariantForOrderRow } from '../../../domain/entities/variant-for-order.entity';
import { sqlStatusesForOrderListGroup } from '../../../domain/order-list-status-group';
import { CouponRow, VolumeTierRow } from '../../../domain/order-pricing';
import {
  CreateTelegramOrderParams,
  ListTelegramOrdersParams,
  OrderRepository,
  PayWithBalanceResult,
} from '../../../domain/repositories/order.repository';

@Injectable()
export class PgOrderRepository implements OrderRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async findUserIdByTelegramId(telegramId: number): Promise<number | null> {
    const result = await this.pool.query<{ id: number }>(
      `SELECT id FROM users WHERE telegram_id = $1 LIMIT 1`,
      [telegramId],
    );
    return result.rows[0]?.id ?? null;
  }

  async findActiveVariantById(variantId: number): Promise<VariantForOrderRow | null> {
    const result = await this.pool.query<{
      id: number;
      product_id: number;
      name_en: string;
      name_vi: string;
      fulfillment_type: string;
      preorder_limit: number | null;
      warranty_type: string;
      warranty_value: number | null;
      warranty_unit: string | null;
      amount_usdt: string;
      amount_vnd: string;
      payment_methods: unknown;
    }>(
      `SELECT
          id,
          product_id,
          name_en,
          name_vi,
          fulfillment_type,
          preorder_limit,
          warranty_type,
          warranty_value,
          warranty_unit,
          amount_usdt,
          amount_vnd,
          payment_methods
        FROM product_variants
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1`,
      [variantId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      productId: row.product_id,
      nameEn: String(row.name_en),
      nameVi: String(row.name_vi),
      fulfillmentType: String(row.fulfillment_type),
      preorderLimit: row.preorder_limit == null ? null : Number(row.preorder_limit),
      warrantyType: String(row.warranty_type),
      warrantyValue: row.warranty_value == null ? null : Number(row.warranty_value),
      warrantyUnit: row.warranty_unit == null ? null : String(row.warranty_unit),
      amountUsdt: Number(row.amount_usdt),
      amountVnd: Number(row.amount_vnd),
      paymentMethods: parsePgEnumArray(row.payment_methods),
    };
  }

  async countAvailableStock(variantId: number): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
        FROM stock_items
        WHERE variant_id = $1
          AND status = 'AVAILABLE'
          AND is_locked = false`,
      [variantId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listActiveVolumeTiers(variantId: number): Promise<VolumeTierRow[]> {
    const result = await this.pool.query<{
      min_quantity: number;
      discount_bps: number;
      is_active: boolean;
    }>(
      `SELECT min_quantity, discount_bps, is_active
        FROM variant_volume_tiers
        WHERE variant_id = $1 AND is_active = TRUE
        ORDER BY min_quantity ASC`,
      [variantId],
    );
    return result.rows.map((row) => ({
      minQuantity: Number(row.min_quantity),
      discountBps: Number(row.discount_bps),
      isActive: Boolean(row.is_active),
    }));
  }

  async findCouponByCode(code: string): Promise<CouponRow | null> {
    const result = await this.pool.query<{
      id: number;
      code: string;
      variant_id: number;
      is_active: boolean;
      starts_at: Date | null;
      ends_at: Date | null;
      visibility: string;
      requires_ownership: boolean;
      discount_type: string;
      percent_bps: number | null;
      amount_usdt: string | null;
      amount_vnd: string | null;
      max_redemptions: number | null;
      per_user_limit: number | null;
    }>(
      `SELECT
          id, code, variant_id, is_active, starts_at, ends_at,
          visibility, requires_ownership, discount_type, percent_bps,
          amount_usdt, amount_vnd,
          max_redemptions, per_user_limit
        FROM coupons
        WHERE UPPER(code) = UPPER($1)
        LIMIT 1`,
      [code.trim()],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      code: row.code,
      variantId: row.variant_id,
      isActive: row.is_active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      visibility: row.visibility,
      requiresOwnership: row.requires_ownership,
      discountType: row.discount_type,
      percentBps: row.percent_bps != null ? Number(row.percent_bps) : null,
      amountUsdt: row.amount_usdt != null ? Number(row.amount_usdt) : null,
      amountVnd: row.amount_vnd != null ? Number(row.amount_vnd) : null,
      maxRedemptions: row.max_redemptions != null ? Number(row.max_redemptions) : null,
      perUserLimit: row.per_user_limit != null ? Number(row.per_user_limit) : null,
    };
  }

  async countCouponRedemptions(
    couponId: number,
    userId: number,
    statuses: readonly string[],
  ): Promise<{ total: number; perUser: number }> {
    const result = await this.pool.query<{ total: string; per_user: string }>(
      `SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE user_id = $2)::text AS per_user
         FROM orders
         WHERE coupon_id = $1
           AND status::text = ANY($3::text[])`,
      [couponId, userId, statuses],
    );
    return {
      total: Number(result.rows[0]?.total ?? 0),
      perUser: Number(result.rows[0]?.per_user ?? 0),
    };
  }

  async findActivePendingOrder(userId: number): Promise<PendingOrderEntity | null> {
    const result = await this.pool.query<{
      id: string;
      payment_code: string;
      status: string;
      payment_method: string;
      currency: string;
      total_price: string;
      created_at: Date;
      quantity: number;
      item_name: string;
    }>(
      `SELECT
          o.id::text,
          o.payment_code,
          o.status::text,
          o.payment_method::text,
          o.currency::text,
          o.total_price,
          o.created_at,
          oi.quantity,
          oi.snapshot_variant_name AS item_name
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1
          AND o.status = 'PENDING'
        ORDER BY o.created_at DESC
        LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;

    const pending: PendingOrderEntity = {
      orderId: row.id,
      paymentCode: row.payment_code,
      status: row.status,
      paymentMethod: row.payment_method,
      currency: row.currency,
      totalPrice: Number(row.total_price),
      createdAt: row.created_at,
      quantity: Number(row.quantity),
      itemName: row.item_name,
    };

    if (TIMED_PENDING_METHODS.has(pending.paymentMethod)) {
      const expiry = buildOrderExpiry(pending.createdAt, pending.paymentMethod);
      if ((expiry.secondsLeft ?? 0) <= 0) {
        await this.cancelPendingOrder(userId, pending.orderId);
        return null;
      }
    }

    return pending;
  }

  async expireTimedPendingOrders(batchSize = 100): Promise<{ cancelledCount: number }> {
    const timedMethods = [...TIMED_PENDING_METHODS];
    const result = await this.pool.query<{ cancelled_count: string }>(
      `WITH expired AS (
          SELECT id
          FROM orders
          WHERE status = 'PENDING'
            AND payment_method = ANY($1::product_payment_method_enum[])
            AND created_at < NOW() - ($2::bigint * INTERVAL '1 millisecond')
          ORDER BY created_at ASC
          LIMIT $3
          FOR UPDATE SKIP LOCKED
        ),
        cancel_orders AS (
          UPDATE orders SET status = 'CANCELLED', updated_at = NOW()
          FROM expired
          WHERE orders.id = expired.id
          RETURNING orders.id
        ),
        release_stock AS (
          UPDATE stock_items
          SET status = 'AVAILABLE',
              is_locked = false,
              order_id = NULL,
              reserved_at = NULL,
              updated_at = NOW()
          FROM cancel_orders co
          WHERE stock_items.order_id = co.id AND stock_items.status = 'RESERVED'
        )
        SELECT COUNT(*)::text AS cancelled_count FROM cancel_orders`,
      [timedMethods, PENDING_PAYMENT_TIMEOUT_MS, batchSize],
    );
    return { cancelledCount: Number(result.rows[0]?.cancelled_count ?? 0) };
  }

  async cancelPendingOrder(userId: number, orderId: string): Promise<boolean> {
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
    return result.rows.length > 0;
  }

  async createTelegramPendingOrder(params: CreateTelegramOrderParams): Promise<CreatedOrderEntity> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (params.variant.fulfillmentType === 'PREORDER' && params.variant.preorderLimit != null) {
        const soldResult = await client.query<{ sold: string }>(
          `SELECT COALESCE(SUM(oi.quantity), 0)::text AS sold
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.variant_id = $1
              AND o.status IN ('PENDING', 'PAID', 'DELIVERED')`,
          [params.variant.id],
        );
        const sold = Number(soldResult.rows[0]?.sold ?? 0);
        if (sold + params.quantity > params.variant.preorderLimit) {
          throw new ApiException('preorder_limit_exceeded', 'Preorder limit exceeded for this variant.', 400);
        }
      }

      const order = usesPaymentCode(params.paymentMethod)
        ? await this.insertOrderWithUniquePaymentCode(client, params)
        : await this.insertOrderWithoutPaymentCode(client, params);

      await client.query(
        `INSERT INTO order_items (
            order_id,
            variant_id,
            quantity,
            unit_price,
            snapshot_variant_name,
            snapshot_fulfillment_type,
            snapshot_warranty_type,
            snapshot_warranty_value,
            snapshot_warranty_unit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          params.variant.id,
          params.quantity,
          params.unitPrice,
          params.snapshotVariantName,
          params.variant.fulfillmentType,
          params.variant.warrantyType,
          params.variant.warrantyValue,
          params.variant.warrantyUnit,
        ],
      );

      if (params.variant.fulfillmentType === 'IN_STOCK') {
        await this.reserveStockForOrder(client, order.id, params.variant.id, params.quantity);
      }

      if (params.userCouponId != null) {
        await this.consumeUserCouponOnOrder(
          client,
          params.userCouponId,
          params.userId,
          order.id,
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async consumeUserCouponOnOrder(
    client: { query: Pool['query'] },
    userCouponId: number,
    userId: number,
    orderId: string,
  ): Promise<void> {
    const result = await client.query(
      `UPDATE user_coupons
        SET used_at = NOW(), order_id = $3::uuid
        WHERE id = $1
          AND user_id = $2
          AND used_at IS NULL`,
      [userCouponId, userId, orderId],
    );
    if ((result.rowCount ?? 0) === 0) {
      throw new ApiException('coupon_already_used', 'This coupon has already been used.', 400);
    }
  }

  private async reserveStockForOrder(
    client: { query: Pool['query'] },
    orderId: string,
    variantId: number,
    quantity: number,
  ): Promise<void> {
    const result = await client.query<{ id: number }>(
      `WITH candidate AS (
          SELECT id
            FROM stock_items
            WHERE variant_id = $1
              AND status = 'AVAILABLE'
              AND is_locked = false
            ORDER BY created_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
        )
        UPDATE stock_items s
          SET status = 'RESERVED',
              is_locked = true,
              order_id = $3::uuid,
              reserved_at = NOW(),
              updated_at = NOW()
          FROM candidate c
          WHERE s.id = c.id
          RETURNING s.id`,
      [variantId, quantity, orderId],
    );
    if ((result.rowCount ?? 0) < quantity) {
      throw new ApiException('insufficient_stock', 'Not enough stock for this quantity.', 400);
    }
  }

  private async insertOrderWithoutPaymentCode(
    client: { query: Pool['query'] },
    params: CreateTelegramOrderParams,
  ): Promise<CreatedOrderEntity> {
    const result = await client.query<{
      id: string;
      payment_code: string | null;
      status: string;
      payment_method: string;
      currency: string;
      total_price: string;
      created_at: Date;
    }>(
      `INSERT INTO orders (
          user_id,
          payment_code,
          total_price,
          currency,
          payment_method,
          coupon_id,
          status
        ) VALUES ($1, NULL, $2, $3::currency_enum, $4::product_payment_method_enum, $5, 'PENDING')
        RETURNING
          id::text,
          payment_code,
          status,
          payment_method,
          currency::text,
          total_price,
          created_at`,
      [params.userId, params.totalPrice, params.currency, params.paymentMethod, params.couponId ?? null],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      paymentCode: row.payment_code,
      status: row.status,
      paymentMethod: row.payment_method,
      currency: row.currency,
      totalPrice: Number(row.total_price),
      createdAt: row.created_at,
    };
  }

  private async insertOrderWithUniquePaymentCode(
    client: { query: Pool['query'] },
    params: CreateTelegramOrderParams,
  ): Promise<CreatedOrderEntity> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const paymentCode = generatePaymentCode();
      try {
        const result = await client.query<{
          id: string;
          payment_code: string;
          status: string;
          payment_method: string;
          currency: string;
          total_price: string;
          created_at: Date;
        }>(
          `INSERT INTO orders (
              user_id,
              payment_code,
              total_price,
              currency,
              payment_method,
              coupon_id,
              status
            ) VALUES ($1, $2, $3, $4::currency_enum, $5::product_payment_method_enum, $6, 'PENDING')
            RETURNING
              id::text,
              payment_code,
              status,
              payment_method,
              currency::text,
              total_price,
              created_at`,
          [
            params.userId,
            paymentCode,
            params.totalPrice,
            params.currency,
            params.paymentMethod,
            params.couponId ?? null,
          ],
        );
        const row = result.rows[0];
        return {
          id: row.id,
          paymentCode: row.payment_code,
          status: row.status,
          paymentMethod: row.payment_method,
          currency: row.currency,
          totalPrice: Number(row.total_price),
          createdAt: row.created_at,
        };
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === '23505') continue;
        throw err;
      }
    }
    throw new ApiException('order_create_failed', 'Could not generate unique payment code.', 500);
  }

  async findOrderPaymentForTelegram(
    orderId: string,
    telegramId: number,
  ): Promise<OrderPaymentEntity | null> {
    const result = await this.pool.query<{
      id: string;
      status: string;
      payment_method: string;
      currency: string;
      total_price: string;
      payment_code: string;
      created_at: Date;
      tx_id: string | null;
    }>(
      `SELECT o.id::text, o.status::text, o.payment_method::text, o.currency::text,
              o.total_price, o.payment_code, o.created_at, o.tx_id
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        WHERE o.id = $1::uuid AND u.telegram_id = $2
        LIMIT 1`,
      [orderId, telegramId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      orderId: row.id,
      status: row.status,
      paymentMethod: row.payment_method,
      currency: row.currency,
      totalPrice: Number(row.total_price),
      paymentCode: row.payment_code,
      createdAt: row.created_at,
      txId: row.tx_id,
    };
  }

  async listPendingBinanceOrders(): Promise<OrderPaymentEntity[]> {
    return this.listPendingOrdersByMethod('BINANCE');
  }

  async listPendingBankOrders(): Promise<OrderPaymentEntity[]> {
    return this.listPendingOrdersByMethod('BANK');
  }

  private async listPendingOrdersByMethod(
    paymentMethod: 'BINANCE' | 'BANK',
  ): Promise<OrderPaymentEntity[]> {
    const result = await this.pool.query<{
      id: string;
      status: string;
      payment_method: string;
      currency: string;
      total_price: string;
      payment_code: string;
      created_at: Date;
      tx_id: string | null;
    }>(
      `SELECT o.id::text, o.status::text, o.payment_method::text, o.currency::text,
              o.total_price, o.payment_code, o.created_at, o.tx_id
        FROM orders o
        WHERE o.status = 'PENDING'
          AND o.payment_method = $2::product_payment_method_enum
          AND o.created_at >= NOW() - ($1::bigint * INTERVAL '1 millisecond')
        ORDER BY o.created_at ASC`,
      [PENDING_PAYMENT_TIMEOUT_MS, paymentMethod],
    );
    return result.rows.map((row) => ({
      orderId: row.id,
      status: row.status,
      paymentMethod: row.payment_method,
      currency: row.currency,
      totalPrice: Number(row.total_price),
      paymentCode: row.payment_code,
      createdAt: row.created_at,
      txId: row.tx_id,
    }));
  }

  async confirmOrderPaidByPaymentCode(
    orderId: string,
    paymentMethod: 'BINANCE' | 'BANK',
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE orders
        SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
        WHERE id = $1::uuid
          AND status = 'PENDING'
          AND payment_method = $2::product_payment_method_enum
        RETURNING id::text`,
      [orderId, paymentMethod],
    );
    return Boolean(result.rows[0]);
  }

  async findOrderDeliveryLines(orderId: string): Promise<string[]> {
    const result = await this.pool.query<{ payload: string }>(
      `SELECT payload FROM stock_items
        WHERE order_id = $1::uuid AND status = 'DELIVERED'
        ORDER BY created_at ASC`,
      [orderId],
    );
    return result.rows.map((row) => row.payload);
  }

  async deliverInStockOrder(orderId: string): Promise<string[] | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query<{
        all_in_stock: boolean;
        expected_count: number;
      }>(
        `SELECT
            (SELECT BOOL_AND(snapshot_fulfillment_type = 'IN_STOCK')
              FROM order_items WHERE order_id = o.id) AS all_in_stock,
            (SELECT SUM(quantity)::int
              FROM order_items WHERE order_id = o.id) AS expected_count
          FROM orders o
          WHERE o.id = $1::uuid AND o.status = 'PAID'
          FOR UPDATE OF o`,
        [orderId],
      );
      if (!orderResult.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const { all_in_stock, expected_count } = orderResult.rows[0];
      if (!all_in_stock) {
        await client.query('COMMIT');
        return [];
      }

      const deliverResult = await client.query<{ payload: string }>(
        `WITH deliver_stock AS (
            UPDATE stock_items
            SET status = 'DELIVERED',
                is_locked = false,
                delivered_at = NOW(),
                updated_at = NOW()
            WHERE order_id = $1::uuid AND status = 'RESERVED'
            RETURNING payload, created_at
          ),
          deliver_order AS (
            UPDATE orders
            SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid
          )
          SELECT payload FROM deliver_stock ORDER BY created_at ASC`,
        [orderId],
      );

      if ((deliverResult.rowCount ?? 0) < expected_count) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('COMMIT');
      return deliverResult.rows.map((r) => r.payload);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listTelegramOrdersByUserId(
    params: ListTelegramOrdersParams,
  ): Promise<{ items: OrderListItemEntity[]; total: number }> {
    const page = params.page;
    const limit = params.limit;
    const offset = (page - 1) * limit;
    const statuses = params.statusGroup
      ? sqlStatusesForOrderListGroup(params.statusGroup)
      : null;

    const result = await this.pool.query<{
      order_id: string;
      status: string;
      total_price: number;
      currency: string;
      payment_method: string;
      created_at: Date;
      first_item_name: string;
      quantity: number;
      total_count: string;
    }>(
      `SELECT
          o.id::text AS order_id,
          o.status::text AS status,
          o.total_price::float8 AS total_price,
          o.currency::text AS currency,
          o.payment_method::text AS payment_method,
          o.created_at,
          COALESCE(
            (SELECT oi.snapshot_variant_name
              FROM order_items oi
              WHERE oi.order_id = o.id
              ORDER BY oi.id ASC
              LIMIT 1),
            ''
          ) AS first_item_name,
          COALESCE(
            (SELECT SUM(oi.quantity)::int FROM order_items oi WHERE oi.order_id = o.id),
            0
          ) AS quantity,
          COUNT(*) OVER()::text AS total_count
        FROM orders o
        WHERE o.user_id = $1
          AND ($4::text[] IS NULL OR o.status::text = ANY($4::text[]))
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3`,
      [params.userId, limit, offset, statuses],
    );

    const total = result.rows.length ? Number(result.rows[0].total_count) : 0;
    return {
      items: result.rows.map((row) => ({
        orderId: row.order_id,
        status: row.status,
        totalPrice: Number(row.total_price),
        currency: row.currency,
        paymentMethod: row.payment_method,
        createdAt: new Date(row.created_at),
        firstItemName: String(row.first_item_name),
        quantity: Number(row.quantity),
      })),
      total,
    };
  }

  async findTelegramOrderDetail(
    orderId: string,
    userId: number,
  ): Promise<OrderDetailEntity | null> {
    const result = await this.pool.query<{
      order_id: string;
      status: string;
      total_price: number;
      currency: string;
      payment_method: string;
      payment_code: string | null;
      created_at: Date;
      paid_at: Date | null;
      delivered_at: Date | null;
      items: unknown;
      delivery_lines: unknown;
    }>(
      `SELECT
          o.id::text AS order_id,
          o.status::text AS status,
          o.total_price::float8 AS total_price,
          o.currency::text AS currency,
          o.payment_method::text AS payment_method,
          o.payment_code,
          o.created_at,
          o.paid_at,
          o.delivered_at,
          (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'variant_id', oi.variant_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price::float8,
                  'snapshot_variant_name', oi.snapshot_variant_name,
                  'snapshot_fulfillment_type', oi.snapshot_fulfillment_type::text
                )
                ORDER BY oi.id ASC
              ),
              '[]'::json
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          ) AS items,
          (
            SELECT COALESCE(
              json_agg(si.payload ORDER BY si.created_at ASC),
              '[]'::json
            )
            FROM stock_items si
            WHERE si.order_id = o.id AND si.status = 'DELIVERED'
          ) AS delivery_lines
        FROM orders o
        WHERE o.id = $1::uuid AND o.user_id = $2
        LIMIT 1`,
      [orderId, userId],
    );

    if (!result.rows[0]) return null;
    const row = result.rows[0];
    const itemsRaw = Array.isArray(row.items) ? row.items : [];
    const deliveryRaw = Array.isArray(row.delivery_lines) ? row.delivery_lines : [];

    return {
      orderId: row.order_id,
      status: row.status,
      totalPrice: Number(row.total_price),
      currency: row.currency,
      paymentMethod: row.payment_method,
      paymentCode: row.payment_code ? String(row.payment_code) : null,
      createdAt: new Date(row.created_at),
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
      items: itemsRaw.map((item: Record<string, unknown>) => ({
        variantId: Number(item.variant_id),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        snapshotVariantName: String(item.snapshot_variant_name),
        snapshotFulfillmentType: String(item.snapshot_fulfillment_type),
      })),
      deliveryLines: deliveryRaw.map((line) => String(line)),
    };
  }

  async payWithBalance(
    orderId: string,
    userId: number,
    paymentMethod: 'BALANCE' | 'BALANCE_VND',
  ): Promise<PayWithBalanceResult> {
    const balanceCol = paymentMethod === 'BALANCE' ? 'balance_usdt' : 'balance_vnd';
    const insufficientCode =
      paymentMethod === 'BALANCE' ? 'insufficient_balance_usdt' : 'insufficient_balance_vnd';

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userRow = await client.query<{ balance: string }>(
        `SELECT ${balanceCol} AS balance FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      if (!userRow.rows[0]) {
        throw new ApiException('user_not_found', 'User not found.', 404);
      }

      const orderRow = await client.query<{ total_price: string }>(
        `SELECT total_price FROM orders
         WHERE id = $1::uuid AND user_id = $2 AND status = 'PENDING'
           AND payment_method = $3::product_payment_method_enum
         FOR UPDATE`,
        [orderId, userId, paymentMethod],
      );
      if (!orderRow.rows[0]) {
        throw new ApiException('order_not_found', 'Order not found or not in PENDING state.', 404);
      }

      const balance = Number(userRow.rows[0].balance);
      const totalPrice = Number(orderRow.rows[0].total_price);
      if (balance < totalPrice) {
        throw new ApiException(insufficientCode, 'Insufficient balance.', 400);
      }

      // Gộp PENDING→PAID và PAID→DELIVERED vào một UPDATE duy nhất để tránh
      // undefined behaviour khi hai CTE sửa cùng row trong orders.
      const result = await client.query<{ payload: string }>(
        `WITH deduct AS (
            UPDATE users
            SET ${balanceCol} = ${balanceCol} - $3::numeric,
                updated_at = NOW()
            WHERE id = $2
            RETURNING id
          ),
          deliver_order AS (
            UPDATE orders
            SET status = 'DELIVERED',
                paid_at = NOW(),
                delivered_at = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid AND (SELECT id FROM deduct) IS NOT NULL
            RETURNING id
          ),
          deliver_stock AS (
            UPDATE stock_items
            SET status = 'DELIVERED',
                is_locked = false,
                delivered_at = NOW(),
                updated_at = NOW()
            WHERE order_id = (SELECT id FROM deliver_order) AND status = 'RESERVED'
            RETURNING payload, created_at
          )
          SELECT payload FROM deliver_stock ORDER BY created_at ASC`,
        [orderId, userId, totalPrice],
      );

      await client.query('COMMIT');
      return { deliveryLines: result.rows.map((r) => String(r.payload)) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

function generatePaymentCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
