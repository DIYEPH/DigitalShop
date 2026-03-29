import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { DatabaseService } from "./database.service";

export type CancelledOrderCleanupResult = {
  retentionDays: number;
  dryRun: boolean;
  candidates: number;
  releasedStockItems: number;
  restoredCoupons: number;
  deletedOrders: number;
};

@Injectable()
export class CleanupService {
  constructor(private readonly database: DatabaseService) {}

  async cleanupCancelledOrders(options: {
    retentionDays?: number;
    dryRun?: boolean;
  } = {}): Promise<CancelledOrderCleanupResult> {
    const retentionDays = this.resolveRetentionDays(options.retentionDays);
    const dryRun = Boolean(options.dryRun);
    const client = await this.database.getPool().connect();

    try {
      await client.query("BEGIN");
      await this.createCandidateTable(client, retentionDays);

      const candidates = await this.countCandidates(client);
      const releasedStockItems = await this.releaseReservedStock(client);
      const restoredCoupons = await this.restoreCoupons(client);
      const deletedOrders = await this.deleteOrders(client);

      if (dryRun) {
        await client.query("ROLLBACK");
      } else {
        await client.query("COMMIT");
      }

      return {
        retentionDays,
        dryRun,
        candidates,
        releasedStockItems,
        restoredCoupons,
        deletedOrders,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private resolveRetentionDays(value?: number): number {
    const raw = value ?? Number(process.env.CANCELLED_ORDER_RETENTION_DAYS || 2);
    if (!Number.isInteger(raw) || raw < 1) {
      throw new Error("CANCELLED_ORDER_RETENTION_DAYS must be a positive integer.");
    }
    return raw;
  }

  private async createCandidateTable(client: PoolClient, retentionDays: number): Promise<void> {
    await client.query(
      `
      CREATE TEMP TABLE cleanup_cancelled_order_ids ON COMMIT DROP AS
      SELECT o.id
      FROM orders o
      LEFT JOIN payment_info pi ON pi.order_id = o.id
      WHERE o.status = 'CANCELLED'::"OrderStatus"
        AND o.updated_at < NOW() - ($1::int * INTERVAL '1 day')
        AND COALESCE(pi.transaction_hash, '') = ''
        AND NOT EXISTS (
          SELECT 1
          FROM stock_items si
          WHERE si.order_id = o.id
            AND si.status = 'DELIVERED'::"StockStatus"
        )
      `,
      [retentionDays],
    );
  }

  private async countCandidates(client: PoolClient): Promise<number> {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM cleanup_cancelled_order_ids`,
    );
    return Number(result.rows[0]?.count || 0);
  }

  private async releaseReservedStock(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
      UPDATE stock_items
      SET status = 'AVAILABLE'::"StockStatus",
          order_id = NULL,
          reserved_at = NULL,
          delivered_at = NULL
      WHERE order_id IN (SELECT id FROM cleanup_cancelled_order_ids)
        AND status = 'RESERVED'::"StockStatus"
      `,
    );
    return result.rowCount ?? 0;
  }

  private async restoreCoupons(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
      UPDATE user_coupons
      SET used_at = NULL,
          order_id = NULL
      WHERE order_id IN (SELECT id FROM cleanup_cancelled_order_ids)
      `,
    );
    return result.rowCount ?? 0;
  }

  private async deleteOrders(client: PoolClient): Promise<number> {
    const result = await client.query(
      `
      DELETE FROM orders
      WHERE id IN (SELECT id FROM cleanup_cancelled_order_ids)
      `,
    );
    return result.rowCount ?? 0;
  }
}
