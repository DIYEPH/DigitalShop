"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("./database.service");
let CleanupService = class CleanupService {
    database;
    constructor(database) {
        this.database = database;
    }
    async cleanupCancelledOrders(options = {}) {
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
            }
            else {
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
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    resolveRetentionDays(value) {
        const raw = value ?? Number(process.env.CANCELLED_ORDER_RETENTION_DAYS || 2);
        if (!Number.isInteger(raw) || raw < 1) {
            throw new Error("CANCELLED_ORDER_RETENTION_DAYS must be a positive integer.");
        }
        return raw;
    }
    async createCandidateTable(client, retentionDays) {
        await client.query(`
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
      `, [retentionDays]);
    }
    async countCandidates(client) {
        const result = await client.query(`SELECT COUNT(*)::text AS count FROM cleanup_cancelled_order_ids`);
        return Number(result.rows[0]?.count || 0);
    }
    async releaseReservedStock(client) {
        const result = await client.query(`
      UPDATE stock_items
      SET status = 'AVAILABLE'::"StockStatus",
          order_id = NULL,
          reserved_at = NULL,
          delivered_at = NULL
      WHERE order_id IN (SELECT id FROM cleanup_cancelled_order_ids)
        AND status = 'RESERVED'::"StockStatus"
      `);
        return result.rowCount ?? 0;
    }
    async restoreCoupons(client) {
        const result = await client.query(`
      UPDATE user_coupons
      SET used_at = NULL,
          order_id = NULL
      WHERE order_id IN (SELECT id FROM cleanup_cancelled_order_ids)
      `);
        return result.rowCount ?? 0;
    }
    async deleteOrders(client) {
        const result = await client.query(`
      DELETE FROM orders
      WHERE id IN (SELECT id FROM cleanup_cancelled_order_ids)
      `);
        return result.rowCount ?? 0;
    }
};
exports.CleanupService = CleanupService;
exports.CleanupService = CleanupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CleanupService);
