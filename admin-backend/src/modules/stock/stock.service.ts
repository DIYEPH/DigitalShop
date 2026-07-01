import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPgPool } from '../../common/database/pg-pool';
import { ErrorCodes } from '../../common/enums/error-codes.enum';
import { FulfillmentType, StockStatus } from '../../common/enums';
import { AddStockDto } from './dto/add-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

type StockRow = {
  id: number;
  product_id: number;
  variant_id: number;
  status: string;
  payload: string;
  note: string | null;
  order_id: string | null;
  reserved_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
};

@Injectable()
export class StockService {
  private get pool() {
    return getPgPool();
  }

  async findAll(shopId: string, query: StockQueryDto) {
    const params: unknown[] = [shopId];
    const conditions: string[] = [`p.shop_id = $1::uuid`];

    if (query.product_id != null) {
      params.push(query.product_id);
      conditions.push(`v.product_id = $${params.length}`);
    }
    if (query.variant_id != null) {
      params.push(query.variant_id);
      conditions.push(`si.variant_id = $${params.length}`);
    }
    if (query.order_id) {
      params.push(query.order_id);
      conditions.push(`si.order_id = $${params.length}::uuid`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`si.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const res = await this.pool.query<StockRow>(
      `SELECT
          si.id,
          v.product_id,
          si.variant_id,
          si.status::text AS status,
          si.payload,
          si.note,
          si.order_id::text AS order_id,
          si.reserved_at,
          si.delivered_at,
          si.created_at
        FROM stock_items si
        INNER JOIN product_variants v ON v.id = si.variant_id
        INNER JOIN products p ON p.id = v.product_id
        ${where}
        ORDER BY si.id DESC
        LIMIT 500`,
      params,
    );

    return {
      items: res.rows.map((row) => this.toDto(row)),
    };
  }

  async add(shopId: string, dto: AddStockDto) {
    const variant = await this.pool.query<{
      id: number;
      fulfillment_type: string;
    }>(
      `SELECT v.id, v.fulfillment_type::text AS fulfillment_type
       FROM product_variants v
       INNER JOIN products p ON p.id = v.product_id
       WHERE v.id = $1 AND v.is_active = TRUE AND p.shop_id = $2::uuid`,
      [dto.variant_id, shopId],
    );

    const row = variant.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_VARIANT_NOT_FOUND,
        message: 'Variant not found',
      });
    }

    if (row.fulfillment_type !== FulfillmentType.IN_STOCK) {
      throw new BadRequestException({
        code: ErrorCodes.STOCK_INVALID_STATUS,
        message: 'Stock can only be added for IN_STOCK variants',
      });
    }

    const payloads = this.parsePayloads(dto.payloads);
    if (payloads.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'At least one payload line is required',
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const payload of payloads) {
        await client.query(
          `INSERT INTO stock_items (variant_id, payload, note, status)
           VALUES ($1, $2, $3, $4)`,
          [dto.variant_id, payload, dto.note ?? null, StockStatus.AVAILABLE],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return { created: payloads.length };
  }

  async update(shopId: string, stockItemId: number, dto: UpdateStockDto) {
    const res = await this.pool.query<{ status: string }>(
      `SELECT si.status::text AS status
       FROM stock_items si
       INNER JOIN product_variants v ON v.id = si.variant_id
       INNER JOIN products p ON p.id = v.product_id
       WHERE si.id = $1 AND p.shop_id = $2::uuid`,
      [stockItemId, shopId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.STOCK_NOT_FOUND,
        message: 'Stock item not found',
      });
    }

    if (row.status === StockStatus.DELIVERED) {
      throw new BadRequestException({
        code: ErrorCodes.STOCK_INVALID_STATUS,
        message: 'Cannot edit a DELIVERED stock item',
      });
    }

    const payload = dto.payload.trim();
    if (!payload) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Payload is required',
      });
    }

    const updated = await this.pool.query<StockRow>(
      `UPDATE stock_items si
       SET payload = $2, note = COALESCE($3, si.note), updated_at = NOW()
       FROM product_variants v
       WHERE si.id = $1 AND si.variant_id = v.id
       RETURNING si.id, v.product_id, si.variant_id, si.status::text AS status,
         si.payload, si.note, si.order_id::text AS order_id,
         si.reserved_at, si.delivered_at, si.created_at`,
      [stockItemId, payload, dto.note ?? null],
    );

    return this.toDto(updated.rows[0]);
  }

  async remove(shopId: string, stockItemId: number) {
    const res = await this.pool.query<{ status: string }>(
      `SELECT si.status::text AS status
       FROM stock_items si
       INNER JOIN product_variants v ON v.id = si.variant_id
       INNER JOIN products p ON p.id = v.product_id
       WHERE si.id = $1 AND p.shop_id = $2::uuid`,
      [stockItemId, shopId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.STOCK_NOT_FOUND,
        message: 'Stock item not found',
      });
    }

    if (row.status !== StockStatus.AVAILABLE) {
      throw new BadRequestException({
        code: ErrorCodes.STOCK_ALREADY_RESERVED,
        message: 'Only AVAILABLE stock items can be deleted',
      });
    }

    await this.pool.query(`DELETE FROM stock_items WHERE id = $1`, [stockItemId]);
    return { message: 'Stock item deleted successfully' };
  }

  private parsePayloads(input: string | string[]): string[] {
    if (Array.isArray(input)) {
      return input.map((s) => String(s).trim()).filter(Boolean);
    }
    return String(input)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private toDto(row: StockRow) {
    return {
      id: row.id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      status: row.status,
      payload: row.payload,
      note: row.note,
      order_id: row.order_id,
      reserved_at: row.reserved_at?.toISOString() ?? null,
      delivered_at: row.delivered_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
    };
  }
}
