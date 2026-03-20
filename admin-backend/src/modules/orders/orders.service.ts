import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";
import {
  createPaginationMeta,
  resolvePagination,
} from "../../common/utils/pagination.util";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { MessageKind, OrderStatus, StockStatus } from "../../common/enums";
import { ConfirmOrderDto } from "./dto/confirm-order.dto";
import { CreateOrderMessageDto } from "./dto/create-order-message.dto";
import { DeliverOrderDto } from "./dto/deliver-order.dto";
import { OrderQueryDto } from "./dto/order-query.dto";

type OrderListRow = {
  id: string;
  user_id: number;
  user_email: string;
  total_price: string;
  currency: string;
  payment_method: string;
  payment_code: string | null;
  status: string;
  item_count: string;
  reserved_count: string;
  delivered_count: string;
  created_at: Date;
  updated_at: Date;
};

type OrderRow = OrderListRow & {
  tx_id: string | null;
  coupon_id: number | null;
  delivery_note: string | null;
  delivered_at: Date | null;
  paid_at: Date | null;
};

type OrderItemRow = {
  id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
  snapshot_variant_name: string;
  snapshot_fulfillment_type: string;
  snapshot_warranty_type: string;
  snapshot_warranty_value: number | null;
  snapshot_warranty_unit: string | null;
  reserved_count: string;
  delivered_count: string;
};

type MessageRow = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number | null;
  sender_role: string;
  kind: string;
  message: string;
  created_at: Date;
};

@Injectable()
export class OrdersService {
  private get pool() {
    return getPgPool();
  }

  async findAll(query: OrderQueryDto) {
    const { page, limit, offset } = resolvePagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`o.status = $${params.length}::order_status_enum`);
    }
    if (query.payment_code?.trim()) {
      params.push(`%${query.payment_code.trim()}%`);
      conditions.push(`o.payment_code ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM orders o ${where}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const listParams = [...params, limit, offset];
    const limitIdx = listParams.length - 1;
    const offsetIdx = listParams.length;

    const res = await this.pool.query<OrderListRow>(
      `SELECT
          o.id::text AS id,
          u.id AS user_id,
          u.email AS user_email,
          o.total_price::text AS total_price,
          o.currency::text AS currency,
          o.payment_method::text AS payment_method,
          o.payment_code,
          o.status::text AS status,
          COUNT(oi.id)::text AS item_count,
          COUNT(si.id) FILTER (WHERE si.status = 'RESERVED')::text AS reserved_count,
          COUNT(si.id) FILTER (WHERE si.status = 'DELIVERED')::text AS delivered_count,
          o.created_at,
          o.updated_at
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN stock_items si ON si.order_id = o.id
        ${where}
        GROUP BY o.id, u.id, u.email, o.total_price, o.currency, o.payment_method,
          o.payment_code, o.status, o.created_at, o.updated_at
        ORDER BY o.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    const orders = res.rows.map((row) => this.toListItem(row));
    const meta = createPaginationMeta(page, limit, total);

    return {
      orders,
      pagination: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.pages,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.getOrderRow(id);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Order ${id} not found`,
      });
    }

    const itemsRes = await this.pool.query<OrderItemRow>(
      `SELECT
          oi.id,
          oi.variant_id,
          oi.quantity,
          oi.unit_price::text AS unit_price,
          oi.snapshot_variant_name,
          oi.snapshot_fulfillment_type::text AS snapshot_fulfillment_type,
          oi.snapshot_warranty_type::text AS snapshot_warranty_type,
          oi.snapshot_warranty_value,
          oi.snapshot_warranty_unit::text AS snapshot_warranty_unit,
          COUNT(si.id) FILTER (WHERE si.status = 'RESERVED')::text AS reserved_count,
          COUNT(si.id) FILTER (WHERE si.status = 'DELIVERED')::text AS delivered_count
        FROM order_items oi
        LEFT JOIN stock_items si ON si.order_id = oi.order_id AND si.variant_id = oi.variant_id
        WHERE oi.order_id = $1::uuid
        GROUP BY oi.id
        ORDER BY oi.id ASC`,
      [id],
    );

    return {
      ...this.toDetail(order),
      items: itemsRes.rows.map((row) => this.toDetailItem(row)),
    };
  }

  async confirm(id: string, dto: ConfirmOrderDto) {
    const order = await this.getOrderRow(id);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Order ${id} not found`,
      });
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_STATUS_TRANSITION,
        message: `Cannot confirm order in status ${order.status}`,
      });
    }

    const res = await this.pool.query<{ id: string; status: string }>(
      `UPDATE orders
        SET status = 'PAID',
            paid_at = NOW(),
            tx_id = COALESCE($2, tx_id),
            updated_at = NOW()
        WHERE id = $1::uuid AND status = 'PENDING'
        RETURNING id::text AS id, status::text AS status`,
      [id, dto.transaction_hash?.trim() || null],
    );
    const row = res.rows[0];
    if (!row) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_INVALID_STATUS_TRANSITION,
        message: "Order is no longer pending",
      });
    }

    return {
      id: row.id,
      status: row.status,
      message: "Order confirmed",
    };
  }

  async deliver(id: string, dto: DeliverOrderDto) {
    const order = await this.getOrderRow(id);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Order ${id} not found`,
      });
    }
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_CANNOT_DELIVER_INCOMPLETE,
        message: `Order must be PAID to deliver (current: ${order.status})`,
      });
    }

    const stockLines = await this.tryDeliverInStock(id);
    if (stockLines === null) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_CANNOT_DELIVER_INCOMPLETE,
        message: "Could not deliver reserved stock for this order",
      });
    }

    if (stockLines.length > 0) {
      if (dto.delivery_note?.trim()) {
        await this.pool.query(
          `UPDATE orders SET delivery_note = $2, updated_at = NOW() WHERE id = $1::uuid`,
          [id, dto.delivery_note.trim()],
        );
      }
      const updated = await this.getOrderRow(id);
      return {
        id: updated!.id,
        status: updated!.status,
        delivered_at: updated!.delivered_at?.toISOString() ?? null,
      };
    }

    const res = await this.pool.query<{
      status: string;
      delivered_at: Date | null;
    }>(
      `UPDATE orders
        SET status = 'DELIVERED',
            delivered_at = NOW(),
            delivery_note = COALESCE($2, delivery_note),
            updated_at = NOW()
        WHERE id = $1::uuid AND status = 'PAID'
        RETURNING status::text AS status, delivered_at`,
      [id, dto.delivery_note?.trim() || null],
    );
    const row = res.rows[0];
    if (!row) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_CANNOT_DELIVER_INCOMPLETE,
        message: "Order could not be marked delivered",
      });
    }

    return {
      id,
      status: row.status,
      delivered_at: row.delivered_at?.toISOString() ?? null,
    };
  }

  async listMessages(orderId: string) {
    await this.assertOrderExists(orderId);
    if (!(await this.hasOrderMessagesTable())) {
      return { messages: [] };
    }

    const res = await this.pool.query<MessageRow>(
      `SELECT id, order_id::text AS order_id, order_item_id, user_id,
              sender_role::text AS sender_role, kind::text AS kind, message, created_at
       FROM order_messages
       WHERE order_id = $1::uuid
       ORDER BY id ASC`,
      [orderId],
    );

    return { messages: res.rows.map((row) => this.toMessage(row)) };
  }

  async addMessage(
    orderId: string,
    dto: CreateOrderMessageDto,
    adminUserId: number,
  ) {
    await this.assertOrderExists(orderId);
    if (!(await this.hasOrderMessagesTable())) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "order_messages table is not available — run DB migration",
      });
    }

    const kind = dto.kind ?? MessageKind.TEXT;
    const res = await this.pool.query<MessageRow>(
      `INSERT INTO order_messages (
          order_id, order_item_id, user_id, sender_role, kind, message
        )
        VALUES ($1::uuid, $2, $3, 'ADMIN', $4::order_message_kind_enum, $5)
        RETURNING id, order_id::text AS order_id, order_item_id, user_id,
          sender_role::text AS sender_role, kind::text AS kind, message, created_at`,
      [
        orderId,
        dto.order_item_id ?? null,
        adminUserId,
        kind,
        dto.message.trim(),
      ],
    );

    return this.toMessage(res.rows[0]);
  }

  private async tryDeliverInStock(orderId: string): Promise<string[] | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query<{
        all_in_stock: boolean;
        expected_count: number;
      }>(
        `SELECT
            (SELECT BOOL_AND(snapshot_fulfillment_type = 'IN_STOCK')
              FROM order_items WHERE order_id = o.id) AS all_in_stock,
            (SELECT COALESCE(SUM(quantity), 0)::int
              FROM order_items WHERE order_id = o.id) AS expected_count
          FROM orders o
          WHERE o.id = $1::uuid AND o.status = 'PAID'
          FOR UPDATE OF o`,
        [orderId],
      );

      if (!orderResult.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      const { all_in_stock, expected_count } = orderResult.rows[0];
      if (!all_in_stock || expected_count <= 0) {
        await client.query("COMMIT");
        return [];
      }

      const deliverResult = await client.query<{ payload: string }>(
        `WITH deliver_stock AS (
            UPDATE stock_items
            SET status = $3::stock_status_enum,
                is_locked = false,
                delivered_at = NOW(),
                updated_at = NOW()
            WHERE order_id = $1::uuid AND status = $2::stock_status_enum
            RETURNING payload, created_at
          ),
          deliver_order AS (
            UPDATE orders
            SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid
          )
          SELECT payload FROM deliver_stock ORDER BY created_at ASC`,
        [orderId, StockStatus.RESERVED, StockStatus.DELIVERED],
      );

      if ((deliverResult.rowCount ?? 0) < expected_count) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query("COMMIT");
      return deliverResult.rows.map((r) => r.payload);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  private async getOrderRow(id: string): Promise<OrderRow | null> {
    const res = await this.pool.query<OrderRow>(
      `SELECT
          o.id::text AS id,
          u.id AS user_id,
          u.email AS user_email,
          o.total_price::text AS total_price,
          o.currency::text AS currency,
          o.payment_method::text AS payment_method,
          o.payment_code,
          o.tx_id,
          o.coupon_id,
          o.status::text AS status,
          (SELECT COUNT(*)::text FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
          (SELECT COUNT(*)::text FROM stock_items si
            WHERE si.order_id = o.id AND si.status = 'RESERVED') AS reserved_count,
          (SELECT COUNT(*)::text FROM stock_items si
            WHERE si.order_id = o.id AND si.status = 'DELIVERED') AS delivered_count,
          o.delivery_note,
          o.delivered_at,
          o.paid_at,
          o.created_at,
          o.updated_at
        FROM orders o
        INNER JOIN users u ON u.id = o.user_id
        WHERE o.id = $1::uuid`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  private async assertOrderExists(orderId: string) {
    const res = await this.pool.query(
      `SELECT 1 FROM orders WHERE id = $1::uuid`,
      [orderId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Order ${orderId} not found`,
      });
    }
  }

  private async hasOrderMessagesTable(): Promise<boolean> {
    const res = await this.pool.query<{ reg: string | null }>(
      `SELECT to_regclass('public.order_messages')::text AS reg`,
    );
    return Boolean(res.rows[0]?.reg);
  }

  private toListItem(row: OrderListRow) {
    return {
      id: row.id,
      user: { id: row.user_id, email: row.user_email },
      total_price: Number(row.total_price),
      currency: row.currency,
      payment_method: row.payment_method,
      payment_code: row.payment_code,
      status: row.status,
      item_count: Number(row.item_count),
      reserved_count: Number(row.reserved_count),
      delivered_count: Number(row.delivered_count),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private toDetail(row: OrderRow) {
    return {
      ...this.toListItem(row),
      tx_id: row.tx_id,
      coupon_id: row.coupon_id,
      delivery_note: row.delivery_note,
      paid_at: row.paid_at?.toISOString() ?? null,
      delivered_at: row.delivered_at?.toISOString() ?? null,
    };
  }

  private toDetailItem(row: OrderItemRow) {
    return {
      id: row.id,
      variant_id: row.variant_id,
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
      snapshot_variant_name: row.snapshot_variant_name,
      snapshot_fulfillment_type: row.snapshot_fulfillment_type,
      snapshot_warranty_type: row.snapshot_warranty_type,
      snapshot_warranty_value: row.snapshot_warranty_value,
      snapshot_warranty_unit: row.snapshot_warranty_unit,
      reserved_count: Number(row.reserved_count),
      delivered_count: Number(row.delivered_count),
    };
  }

  private toMessage(row: MessageRow) {
    return {
      id: row.id,
      order_id: row.order_id,
      order_item_id: row.order_item_id,
      user_id: row.user_id,
      sender_role: row.sender_role,
      kind: row.kind,
      message: row.message,
      created_at: row.created_at.toISOString(),
    };
  }
}
