import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ApiException } from '../../../../../shared/errors/api.exception';
import { COUPON_REDEMPTION_STATUSES, CouponRow } from '../../../../order/domain/order-pricing';
import { ShopCouponRow } from '../../../domain/entities/shop-coupon-row.entity';
import { UserCouponWalletRow } from '../../../domain/entities/user-coupon-wallet-row.entity';
import {
  CouponRepository,
  ListUserCouponsParams,
} from '../../../domain/repositories/coupon.repository';
import { COUPON_SELECT, mapCouponRow } from '../coupon-row.mapper';

type CouponDbRow = Parameters<typeof mapCouponRow>[0];

@Injectable()
export class PgCouponRepository implements CouponRepository {
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

  async listUserCoupons(params: ListUserCouponsParams): Promise<UserCouponWalletRow[]> {
    const usedFilter =
      params.status === 'used' ? 'uc.used_at IS NOT NULL' : 'uc.used_at IS NULL';

    const result = await this.pool.query<
      CouponDbRow & {
        user_coupon_id: number;
        used_at: Date | null;
        product_name_en: string;
        product_name_vi: string;
        variant_name_en: string;
        variant_name_vi: string;
      }
    >(
      `SELECT
          uc.id AS user_coupon_id,
          uc.used_at,
          ${COUPON_SELECT},
          p.name_en AS product_name_en,
          p.name_vi AS product_name_vi,
          pv.name_en AS variant_name_en,
          pv.name_vi AS variant_name_vi
        FROM user_coupons uc
        INNER JOIN coupons c ON c.id = uc.coupon_id
        INNER JOIN product_variants pv ON pv.id = c.variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE uc.user_id = $1
          AND ${usedFilter}
          AND ($2::int IS NULL OR c.variant_id = $2)
        ORDER BY uc.purchased_at DESC, uc.id DESC`,
      [params.userId, params.variantId ?? null],
    );

    return result.rows.map((row) => ({
      userCouponId: row.user_coupon_id,
      usedAt: row.used_at,
      coupon: mapCouponRow(row),
      productNameEn: row.product_name_en,
      productNameVi: row.product_name_vi,
      variantNameEn: row.variant_name_en,
      variantNameVi: row.variant_name_vi,
    }));
  }

  async listShopCoupons(): Promise<ShopCouponRow[]> {
    const result = await this.pool.query<
      CouponDbRow & {
        product_name_en: string;
        product_name_vi: string;
        variant_name_en: string;
        variant_name_vi: string;
      }
    >(
      `SELECT
          ${COUPON_SELECT},
          p.name_en AS product_name_en,
          p.name_vi AS product_name_vi,
          pv.name_en AS variant_name_en,
          pv.name_vi AS variant_name_vi
        FROM coupons c
        INNER JOIN product_variants pv ON pv.id = c.variant_id AND pv.is_active = TRUE
        INNER JOIN products p ON p.id = pv.product_id
        WHERE c.requires_ownership = TRUE
          AND c.cost_point > 0
          AND c.is_active = TRUE
        ORDER BY c.cost_point ASC, c.code ASC`,
    );

    return result.rows.map((row) => ({
      coupon: mapCouponRow(row),
      productNameEn: row.product_name_en,
      productNameVi: row.product_name_vi,
      variantNameEn: row.variant_name_en,
      variantNameVi: row.variant_name_vi,
    }));
  }

  async findCouponByCode(code: string): Promise<CouponRow | null> {
    const result = await this.pool.query<CouponDbRow>(
      `SELECT ${COUPON_SELECT}
        FROM coupons c
        WHERE UPPER(c.code) = UPPER($1)
        LIMIT 1`,
      [code.trim()],
    );
    const row = result.rows[0];
    return row ? mapCouponRow(row) : null;
  }

  async findUserCouponById(
    userCouponId: number,
    userId: number,
  ): Promise<UserCouponWalletRow | null> {
    const result = await this.pool.query<
      CouponDbRow & {
        user_coupon_id: number;
        used_at: Date | null;
        product_name_en: string;
        product_name_vi: string;
        variant_name_en: string;
        variant_name_vi: string;
      }
    >(
      `SELECT
          uc.id AS user_coupon_id,
          uc.used_at,
          ${COUPON_SELECT},
          p.name_en AS product_name_en,
          p.name_vi AS product_name_vi,
          pv.name_en AS variant_name_en,
          pv.name_vi AS variant_name_vi
        FROM user_coupons uc
        INNER JOIN coupons c ON c.id = uc.coupon_id
        INNER JOIN product_variants pv ON pv.id = c.variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE uc.id = $1 AND uc.user_id = $2
        LIMIT 1`,
      [userCouponId, userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      userCouponId: row.user_coupon_id,
      usedAt: row.used_at,
      coupon: mapCouponRow(row),
      productNameEn: row.product_name_en,
      productNameVi: row.product_name_vi,
      variantNameEn: row.variant_name_en,
      variantNameVi: row.variant_name_vi,
    };
  }

  async findUnusedUserCouponByCode(
    userId: number,
    code: string,
  ): Promise<UserCouponWalletRow | null> {
    const result = await this.pool.query<
      CouponDbRow & {
        user_coupon_id: number;
        used_at: Date | null;
        product_name_en: string;
        product_name_vi: string;
        variant_name_en: string;
        variant_name_vi: string;
      }
    >(
      `SELECT
          uc.id AS user_coupon_id,
          uc.used_at,
          ${COUPON_SELECT},
          p.name_en AS product_name_en,
          p.name_vi AS product_name_vi,
          pv.name_en AS variant_name_en,
          pv.name_vi AS variant_name_vi
        FROM user_coupons uc
        INNER JOIN coupons c ON c.id = uc.coupon_id
        INNER JOIN product_variants pv ON pv.id = c.variant_id
        INNER JOIN products p ON p.id = pv.product_id
        WHERE uc.user_id = $1
          AND UPPER(c.code) = UPPER($2)
          AND uc.used_at IS NULL
        ORDER BY uc.id ASC
        LIMIT 1`,
      [userId, code.trim()],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      userCouponId: row.user_coupon_id,
      usedAt: row.used_at,
      coupon: mapCouponRow(row),
      productNameEn: row.product_name_en,
      productNameVi: row.product_name_vi,
      variantNameEn: row.variant_name_en,
      variantNameVi: row.variant_name_vi,
    };
  }

  async redeemShopCoupon(userId: number, code: string): Promise<{ userCouponId: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const couponResult = await client.query<CouponDbRow & { cost_point: number }>(
        `SELECT ${COUPON_SELECT}, c.cost_point
          FROM coupons c
          WHERE UPPER(c.code) = UPPER($1)
          FOR UPDATE`,
        [code.trim()],
      );
      const row = couponResult.rows[0];
      if (!row || !row.is_active) {
        throw new ApiException('coupon_invalid', 'Invalid coupon code.', 400);
      }
      if (!row.requires_ownership || Number(row.cost_point) <= 0) {
        throw new ApiException('coupon_not_for_sale', 'This coupon is not available in the shop.', 400);
      }

      const costPoint = Number(row.cost_point);
      const balanceResult = await client.query<{ balance_point: string }>(
        `SELECT balance_point::text FROM users WHERE id = $1 FOR UPDATE`,
        [userId],
      );
      const balance = Number(balanceResult.rows[0]?.balance_point ?? 0);
      if (balance < costPoint) {
        throw new ApiException(
          'insufficient_balance_point',
          'Insufficient balance points.',
          400,
        );
      }

      await client.query(
        `UPDATE users SET balance_point = balance_point - $2, updated_at = NOW() WHERE id = $1`,
        [userId, costPoint],
      );

      const insert = await client.query<{ id: number }>(
        `INSERT INTO user_coupons (user_id, coupon_id) VALUES ($1, $2) RETURNING id`,
        [userId, row.id],
      );

      await client.query('COMMIT');
      return { userCouponId: insert.rows[0].id };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async consumeUserCoupon(
    client: PoolClient,
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
}
