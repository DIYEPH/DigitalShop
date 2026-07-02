import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ApiException } from '../../../../../shared/errors/api.exception';
import {
  assertShopCustomerNotBanned,
  upsertShopCustomer,
} from '../../../../../shared/infrastructure/shop-customer';
import {
  BindReferralResult,
  ReferralListItem,
  ReferralMeSnapshot,
  ReferralRepository,
} from '../../../domain/repositories/referral.repository';
import {
  creditUserPoints,
  rethrowReferralBindError,
} from '../referral-pg.helpers';

type ReferralListRow = {
  referredUserId: number;
  displayName: string;
  createdAt: string;
  referrerBonusAwarded: boolean;
};

@Injectable()
export class PgReferralRepository implements ReferralRepository {
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

  async getReferralMeByTelegramId(
    shopId: string,
    telegramId: number,
  ): Promise<ReferralMeSnapshot | null> {
    const result = await this.pool.query<{
      referral_code: string;
      referred_by_user_id: number | null;
      total_referrals: string;
      total_earned_points: string;
      referrals_json: ReferralListRow[] | null;
    }>(
      `SELECT
          u.referral_code,
          (SELECT r.referrer_user_id FROM referrals r
            WHERE r.referred_user_id = u.id AND r.shop_id = $2::uuid
            LIMIT 1) AS referred_by_user_id,
          (SELECT COUNT(*)::text FROM referrals r
            WHERE r.referrer_user_id = u.id AND r.shop_id = $2::uuid) AS total_referrals,
          (SELECT COALESCE(SUM(r.referrer_bonus_points), 0)::text
             FROM referrals r
            WHERE r.referrer_user_id = u.id
              AND r.shop_id = $2::uuid
              AND r.referrer_bonus_awarded_at IS NOT NULL) AS total_earned_points,
          (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'referredUserId', ru.id,
                  'displayName', COALESCE(NULLIF(TRIM(ru.full_name), ''), NULLIF(TRIM(ru.username), ''), ru.telegram_id::text),
                  'createdAt', r.created_at,
                  'referrerBonusAwarded', (r.referrer_bonus_awarded_at IS NOT NULL)
                )
                ORDER BY r.created_at DESC
              ),
              '[]'::json
            )
            FROM referrals r
            INNER JOIN users ru ON ru.id = r.referred_user_id
            WHERE r.referrer_user_id = u.id AND r.shop_id = $2::uuid
          ) AS referrals_json
        FROM users u
        WHERE u.telegram_id = $1
        LIMIT 1`,
      [telegramId, shopId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      referralCode: row.referral_code,
      referredByUserId: row.referred_by_user_id,
      canBind: row.referred_by_user_id == null,
      totalReferrals: Number(row.total_referrals ?? 0),
      totalEarnedPoints: Number(row.total_earned_points ?? 0),
      referrals: this.parseReferralList(row.referrals_json),
    };
  }

  async bindReferralByCode(
    shopId: string,
    referredUserId: number,
    code: string,
    refereeBonusPoints: number,
    referrerBonusPoints: number,
  ): Promise<BindReferralResult | null> {
    const normalizedCode = code.trim();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await assertShopCustomerNotBanned(client, shopId, referredUserId);
      await upsertShopCustomer(client, shopId, referredUserId);

      const referredRow = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE id = $1 FOR UPDATE`,
        [referredUserId],
      );
      if (!referredRow.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const existingBind = await client.query(
        `SELECT 1 FROM referrals
          WHERE referred_user_id = $1 AND shop_id = $2::uuid
          LIMIT 1`,
        [referredUserId, shopId],
      );
      if ((existingBind.rowCount ?? 0) > 0) {
        throw new ApiException('referral_already_bound', 'Referral code already bound.', 400);
      }

      const referrerRow = await client.query<{
        id: number;
        full_name: string | null;
        username: string | null;
      }>(
        `SELECT id, full_name, username FROM users
          WHERE UPPER(referral_code) = UPPER($1)
          LIMIT 1
          FOR UPDATE`,
        [normalizedCode],
      );
      const referrer = referrerRow.rows[0];
      if (!referrer) {
        throw new ApiException('referral_invalid', 'Invalid referral code.', 400);
      }
      if (referrer.id === referredUserId) {
        throw new ApiException('referral_self', 'Cannot use your own referral code.', 400);
      }

      try {
        await client.query(
          `INSERT INTO referrals (
             shop_id,
             referrer_user_id,
             referred_user_id,
             referee_bonus_points,
             referrer_bonus_points,
             referrer_bonus_awarded_at
           )
           VALUES ($1::uuid, $2, $3, $4, $5, NOW())`,
          [shopId, referrer.id, referredUserId, refereeBonusPoints, referrerBonusPoints],
        );
      } catch (err) {
        rethrowReferralBindError(err);
      }

      // Keep the legacy global pointer for the web flow: only the first bind wins.
      await client.query(
        `UPDATE users SET referred_by_user_id = $2, updated_at = NOW()
          WHERE id = $1 AND referred_by_user_id IS NULL`,
        [referredUserId, referrer.id],
      );

      const balancePoint = await creditUserPoints(client, shopId, referredUserId, refereeBonusPoints);
      await creditUserPoints(client, shopId, referrer.id, referrerBonusPoints);

      await client.query('COMMIT');

      const referrerDisplayName =
        referrer.full_name?.trim() || referrer.username?.trim() || 'Friend';

      return {
        refereeBonusPoints,
        balancePoint,
        referrerDisplayName,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private parseReferralList(raw: ReferralListRow[] | null): ReferralListItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      referredUserId: Number(item.referredUserId),
      displayName: String(item.displayName),
      createdAt: new Date(item.createdAt),
      referrerBonusAwarded: Boolean(item.referrerBonusAwarded),
    }));
  }
}
