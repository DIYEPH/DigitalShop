import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  assertShopCustomerNotBanned,
  upsertShopCustomer,
} from '../../../../../shared/infrastructure/shop-customer';
import {
  DailyLoginClaimResult,
  DailyLoginStatusSnapshot,
  PointRepository,
} from '../../../domain/repositories/point.repository';

@Injectable()
export class PgPointRepository implements PointRepository {
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

  async getDailyLoginStatusByTelegramId(
    shopId: string,
    telegramId: number,
    claimDate: string,
    timezone: string,
  ): Promise<DailyLoginStatusSnapshot | null> {
    const result = await this.pool.query<{
      claimed_today: boolean;
      next_claim_at: Date | null;
    }>(
      `SELECT
          (c.id IS NOT NULL) AS claimed_today,
          CASE
            WHEN c.id IS NOT NULL THEN (
              (($2::date + INTERVAL '1 day')::timestamp AT TIME ZONE $3) AT TIME ZONE 'UTC'
            )::timestamptz
          END AS next_claim_at
        FROM users u
        LEFT JOIN daily_login_point_claims c
          ON c.user_id = u.id AND c.claim_date = $2::date AND c.shop_id = $4::uuid
        WHERE u.telegram_id = $1
        LIMIT 1`,
      [telegramId, claimDate, timezone, shopId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      claimedToday: Boolean(row.claimed_today),
      nextClaimAt: row.next_claim_at ? row.next_claim_at.toISOString() : null,
    };
  }

  async claimDailyLogin(
    shopId: string,
    userId: number,
    claimDate: string,
    pointsAwarded: number,
  ): Promise<DailyLoginClaimResult | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await assertShopCustomerNotBanned(client, shopId, userId);
      await upsertShopCustomer(client, shopId, userId);

      const claimInsert = await client.query<{ id: number }>(
        `INSERT INTO daily_login_point_claims (shop_id, user_id, claim_date, points_awarded)
         VALUES ($1::uuid, $2, $3::date, $4)
         ON CONFLICT (shop_id, user_id, claim_date) WHERE shop_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [shopId, userId, claimDate, pointsAwarded],
      );
      if ((claimInsert.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `INSERT INTO point_transactions (shop_id, user_id, amount, type)
         VALUES ($1::uuid, $2, $3, 'EARN'::point_tx_type_enum)`,
        [shopId, userId, pointsAwarded],
      );

      const balanceResult = await client.query<{ balance_point: string }>(
        `INSERT INTO user_shop_balances (user_id, shop_id, balance_point)
         VALUES ($1, $2::uuid, $3)
         ON CONFLICT (user_id, shop_id) DO UPDATE
         SET balance_point = user_shop_balances.balance_point + EXCLUDED.balance_point,
             updated_at = NOW()
         RETURNING balance_point::float8 AS balance_point`,
        [userId, shopId, pointsAwarded],
      );

      await client.query('COMMIT');

      const balancePoint = Number(balanceResult.rows[0]?.balance_point ?? 0);
      return { pointsAwarded, balancePoint };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
