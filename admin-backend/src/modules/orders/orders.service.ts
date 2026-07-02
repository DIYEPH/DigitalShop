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
import {
  MessageKind,
  OrderStatus,
  StockStatus,
  WarrantyRequestStatus,
} from "../../common/enums";
import { ConfirmOrderDto } from "./dto/confirm-order.dto";
import { CreateOrderMessageDto } from "./dto/create-order-message.dto";
import { DeliverOrderDto } from "./dto/deliver-order.dto";
import { OrderQueryDto } from "./dto/order-query.dto";
import {
  ResolveWarrantyDto,
  WarrantyResolution,
} from "./dto/resolve-warranty.dto";

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
  open_warranty_count: string;
  created_at: Date;
  updated_at: Date;
};

type WarrantyRequestRow = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number;
  reason: string;
  days_used: number | null;
  status: string;
  resolution_note: string | null;
  resolved_by: number | null;
  resolved_at: Date | null;
  created_at: Date;
  variant_id: number | null;
  snapshot_variant_name: string | null;
  warranty_type: string | null;
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

  async findAll(shopId: string, query: OrderQueryDto) {
    const { page, limit, offset } = resolvePagination(query);
    const hasWarranty = await this.hasWarrantyRequestsTable();
    const params: unknown[] = [shopId];
    const conditions: string[] = [`o.shop_id = $1::uuid`];

    if (query.status) {
      params.push(query.status);
      conditions.push(`o.status = $${params.length}::order_status_enum`);
    }
    if (query.payment_code?.trim()) {
      params.push(`%${query.payment_code.trim()}%`);
      conditions.push(`o.payment_code ILIKE $${params.length}`);
    }
    if (query.warranty === "open" && hasWarranty) {
      conditions.push(
        `EXISTS (SELECT 1 FROM warranty_requests wr WHERE wr.order_id = o.id AND wr.status = 'OPEN')`,
      );
    }

    const openWarrantySelect = hasWarranty
      ? `(SELECT COUNT(*) FROM warranty_requests wr WHERE wr.order_id = o.id AND wr.status = 'OPEN')::text`
      : `'0'::text`;

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
          ${openWarrantySelect} AS open_warranty_count,
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

  async findOne(shopId: string, id: string) {
    const order = await this.getOrderRow(shopId, id);
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Order ${id} not found`,
      });
    }

    if (order.status === OrderStatus.PAID) {
      await this.ensurePreorderSlots(id);
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

  async confirm(shopId: string, id: string, dto: ConfirmOrderDto) {
    const order = await this.getOrderRow(shopId, id);
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
        WHERE id = $1::uuid AND shop_id = $3::uuid AND status = 'PENDING'
        RETURNING id::text AS id, status::text AS status`,
      [id, dto.transaction_hash?.trim() || null, shopId],
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

  async deliver(shopId: string, id: string, dto: DeliverOrderDto) {
    const order = await this.getOrderRow(shopId, id);
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

    await this.ensurePreorderSlots(id);

    const counts = await this.pool.query<{
      expected: number;
      reserved: number;
      unfilled: number;
    }>(
      `SELECT
          (SELECT COALESCE(SUM(quantity), 0)::int FROM order_items WHERE order_id = $1::uuid) AS expected,
          (SELECT COUNT(*)::int FROM stock_items WHERE order_id = $1::uuid AND status = 'RESERVED') AS reserved,
          (SELECT COUNT(*)::int FROM stock_items
            WHERE order_id = $1::uuid AND status = 'RESERVED' AND btrim(COALESCE(payload, '')) = '') AS unfilled`,
      [id],
    );
    const { expected, reserved, unfilled } = counts.rows[0];

    if (expected > 0) {
      if (reserved < expected) {
        throw new BadRequestException({
          code: ErrorCodes.ORDER_STOCK_ITEMS_MISMATCH,
          message: `Order is missing ${expected - reserved} stock slot(s) required to deliver`,
        });
      }
      if (unfilled > 0) {
        throw new BadRequestException({
          code: ErrorCodes.ORDER_CANNOT_DELIVER_INCOMPLETE,
          message: `Cannot deliver: ${unfilled} stock slot(s) still need a payload`,
        });
      }
    }

    const delivered = await this.deliverReservedStock(shopId, id, expected);
    if (!delivered) {
      throw new BadRequestException({
        code: ErrorCodes.ORDER_CANNOT_DELIVER_INCOMPLETE,
        message: "Order could not be marked delivered",
      });
    }

    if (dto.delivery_note?.trim()) {
      await this.pool.query(
        `UPDATE orders
         SET delivery_note = $2, updated_at = NOW()
         WHERE id = $1::uuid AND shop_id = $3::uuid`,
        [id, dto.delivery_note.trim(), shopId],
      );
    }

    const updated = await this.getOrderRow(shopId, id);
    return {
      id: updated!.id,
      status: updated!.status,
      delivered_at: updated!.delivered_at?.toISOString() ?? null,
    };
  }

  async listMessages(shopId: string, orderId: string) {
    await this.assertOrderExists(shopId, orderId);
    if (!(await this.hasOrderMessagesTable())) {
      return { messages: [] };
    }

    const res = await this.pool.query<MessageRow>(
      `SELECT id, order_id::text AS order_id, order_item_id, user_id,
              sender_role::text AS sender_role, kind::text AS kind, message, created_at
       FROM order_messages
       WHERE order_id = $1::uuid AND shop_id = $2::uuid
       ORDER BY id ASC`,
      [orderId, shopId],
    );

    return { messages: res.rows.map((row) => this.toMessage(row)) };
  }

  async addMessage(
    shopId: string,
    orderId: string,
    dto: CreateOrderMessageDto,
    adminUserId: number,
  ) {
    await this.assertOrderExists(shopId, orderId);
    if (!(await this.hasOrderMessagesTable())) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "order_messages table is not available — run DB migration",
      });
    }

    const kind = dto.kind ?? MessageKind.TEXT;
    const res = await this.pool.query<MessageRow>(
      `INSERT INTO order_messages (
          shop_id, order_id, order_item_id, user_id, sender_role, kind, message
        )
        VALUES ($1::uuid, $2::uuid, $3, $4, 'ADMIN', $5::order_message_kind_enum, $6)
        RETURNING id, order_id::text AS order_id, order_item_id, user_id,
          sender_role::text AS sender_role, kind::text AS kind, message, created_at`,
      [
        shopId,
        orderId,
        dto.order_item_id ?? null,
        adminUserId,
        kind,
        dto.message.trim(),
      ],
    );

    return this.toMessage(res.rows[0]);
  }

  async listWarrantyRequests(shopId: string, orderId: string) {
    await this.assertOrderExists(shopId, orderId);
    if (!(await this.hasWarrantyRequestsTable())) {
      return { requests: [] };
    }

    const res = await this.pool.query<WarrantyRequestRow>(
      `SELECT wr.id, wr.order_id::text AS order_id, wr.order_item_id, wr.user_id,
              wr.reason, wr.days_used, wr.status::text AS status, wr.resolution_note,
              wr.resolved_by, wr.resolved_at, wr.created_at,
              oi.variant_id, oi.snapshot_variant_name,
              oi.snapshot_warranty_type::text AS warranty_type
       FROM warranty_requests wr
       LEFT JOIN order_items oi ON oi.id = wr.order_item_id
       WHERE wr.order_id = $1::uuid AND wr.shop_id = $2::uuid
       ORDER BY wr.id DESC`,
      [orderId, shopId],
    );

    return { requests: res.rows.map((row) => this.toWarrantyRequest(row)) };
  }

  /**
   * Resolve a warranty claim. REPLACED attaches a fresh DELIVERED stock row to the
   * order (so the buyer sees the replacement payload); REFUNDED/REJECTED only record
   * the seller decision. A SYSTEM message is posted so the buyer is notified.
   */
  async resolveWarranty(
    shopId: string,
    orderId: string,
    requestId: number,
    dto: ResolveWarrantyDto,
    adminUserId: number,
  ) {
    await this.assertOrderExists(shopId, orderId);
    if (!(await this.hasWarrantyRequestsTable())) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "warranty_requests table is not available — run DB migration",
      });
    }

    const found = await this.pool.query<{
      id: number;
      status: string;
      order_item_id: number | null;
      variant_id: number | null;
    }>(
      `SELECT wr.id, wr.status::text AS status, wr.order_item_id, oi.variant_id
       FROM warranty_requests wr
       LEFT JOIN order_items oi ON oi.id = wr.order_item_id
       WHERE wr.id = $1 AND wr.order_id = $2::uuid AND wr.shop_id = $3::uuid`,
      [requestId, orderId, shopId],
    );
    const request = found.rows[0];
    if (!request) {
      throw new NotFoundException({
        code: ErrorCodes.ORDER_NOT_FOUND,
        message: `Warranty request ${requestId} not found`,
      });
    }
    if (request.status !== WarrantyRequestStatus.OPEN) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Warranty request is already ${request.status}`,
      });
    }

    if (dto.resolution === WarrantyResolution.REPLACED) {
      const payload = dto.payload?.trim();
      if (!payload) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "payload is required to replace a faulty item",
        });
      }
      if (!request.variant_id) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Warranty request has no linked order item / variant",
        });
      }
      await this.pool.query(
        `INSERT INTO stock_items
           (variant_id, status, is_locked, payload, note, order_id, reserved_at, delivered_at)
         VALUES ($1, 'DELIVERED', false, $2, 'warranty replacement', $3::uuid, NOW(), NOW())`,
        [request.variant_id, payload, orderId],
      );
    }

    if (dto.resolution === WarrantyResolution.REJECTED && !dto.note?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "note is required when rejecting a warranty request",
      });
    }

    await this.pool.query(
      `UPDATE warranty_requests
       SET status = $1::warranty_request_status_enum,
           resolution_note = $2,
           resolved_by = $3,
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [dto.resolution, dto.note?.trim() || null, adminUserId, requestId],
    );

    await this.postWarrantySystemMessage(
      shopId,
      orderId,
      request.order_item_id,
      adminUserId,
      dto,
    );

    return { id: requestId, status: dto.resolution };
  }

  private async postWarrantySystemMessage(
    shopId: string,
    orderId: string,
    orderItemId: number | null,
    adminUserId: number,
    dto: ResolveWarrantyDto,
  ): Promise<void> {
    if (!(await this.hasOrderMessagesTable())) return;

    let message: string;
    if (dto.resolution === WarrantyResolution.REPLACED) {
      message = "Đã bổ sung hàng bảo hành mới cho đơn.";
    } else if (dto.resolution === WarrantyResolution.REFUNDED) {
      message = "Seller đã xử lý hoàn tiền cho yêu cầu bảo hành.";
    } else {
      message = `Yêu cầu bảo hành bị từ chối: ${dto.note?.trim() ?? ""}`;
    }
    if (dto.note?.trim() && dto.resolution !== WarrantyResolution.REJECTED) {
      message += ` (${dto.note.trim()})`;
    }

    await this.pool.query(
      `INSERT INTO order_messages
         (shop_id, order_id, order_item_id, user_id, sender_role, kind, message)
       VALUES ($1::uuid, $2::uuid, $3, $4, 'ADMIN', 'SYSTEM'::order_message_kind_enum, $5)`,
      [shopId, orderId, orderItemId, adminUserId, message],
    );
  }

  /**
   * Lazily create RESERVED stock slots (empty payload) for every PREORDER unit of a
   * paid order. Idempotent: only tops up the difference between ordered quantity and
   * existing RESERVED/DELIVERED rows, so repeated calls never over-provision.
   */
  private async ensurePreorderSlots(orderId: string): Promise<void> {
    await this.pool.query(
      `WITH need AS (
          SELECT oi.variant_id,
                 oi.quantity - COALESCE((
                   SELECT COUNT(*) FROM stock_items si
                   WHERE si.order_id = oi.order_id
                     AND si.variant_id = oi.variant_id
                     AND si.status IN ('RESERVED', 'DELIVERED')
                 ), 0) AS missing
          FROM order_items oi
          WHERE oi.order_id = $1::uuid AND oi.snapshot_fulfillment_type = 'PREORDER'
        )
        INSERT INTO stock_items (variant_id, status, payload, order_id, reserved_at, is_locked)
        SELECT n.variant_id, 'RESERVED'::stock_status_enum, '', $1::uuid, NOW(), true
        FROM need n
        CROSS JOIN LATERAL generate_series(1, GREATEST(n.missing, 0)) AS g
        WHERE n.missing > 0`,
      [orderId],
    );
  }

  /**
   * Deliver a PAID order by flipping all its RESERVED stock to DELIVERED inside a
   * transaction. Requires the delivered count to cover the ordered quantity, otherwise
   * rolls back and returns false.
   */
  private async deliverReservedStock(
    shopId: string,
    orderId: string,
    expectedCount: number,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const lock = await client.query(
        `SELECT id FROM orders
         WHERE id = $1::uuid AND shop_id = $2::uuid AND status = 'PAID'
         FOR UPDATE`,
        [orderId, shopId],
      );
      if (!lock.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }

      const deliverResult = await client.query(
        `UPDATE stock_items
         SET status = $2::stock_status_enum,
             is_locked = false,
             delivered_at = NOW(),
             updated_at = NOW()
         WHERE order_id = $1::uuid AND status = $3::stock_status_enum`,
        [orderId, StockStatus.DELIVERED, StockStatus.RESERVED],
      );

      if ((deliverResult.rowCount ?? 0) < expectedCount) {
        await client.query("ROLLBACK");
        return false;
      }

      await client.query(
        `UPDATE orders
         SET status = 'DELIVERED', delivered_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid AND shop_id = $2::uuid AND status = 'PAID'`,
        [orderId, shopId],
      );

      await client.query("COMMIT");
      return true;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  private async getOrderRow(shopId: string, id: string): Promise<OrderRow | null> {
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
        WHERE o.id = $1::uuid AND o.shop_id = $2::uuid`,
      [id, shopId],
    );
    return res.rows[0] ?? null;
  }

  private async assertOrderExists(shopId: string, orderId: string) {
    const res = await this.pool.query(
      `SELECT 1 FROM orders WHERE id = $1::uuid AND shop_id = $2::uuid`,
      [orderId, shopId],
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

  private async hasWarrantyRequestsTable(): Promise<boolean> {
    const res = await this.pool.query<{ reg: string | null }>(
      `SELECT to_regclass('public.warranty_requests')::text AS reg`,
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
      open_warranty_count: Number(row.open_warranty_count ?? 0),
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

  private toWarrantyRequest(row: WarrantyRequestRow) {
    return {
      id: row.id,
      order_id: row.order_id,
      order_item_id: row.order_item_id,
      user_id: row.user_id,
      reason: row.reason,
      days_used: row.days_used,
      status: row.status,
      resolution_note: row.resolution_note,
      resolved_by: row.resolved_by,
      resolved_at: row.resolved_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      variant_id: row.variant_id,
      snapshot_variant_name: row.snapshot_variant_name,
      warranty_type: row.warranty_type,
    };
  }
}
