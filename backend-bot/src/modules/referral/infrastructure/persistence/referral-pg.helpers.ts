import type { PoolClient } from 'pg';
import { ApiException } from '../../../../shared/errors/api.exception';

export function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/** Credits loyalty points to the user's per-shop balance and logs the transaction. */
export async function creditUserPoints(
  client: PoolClient,
  shopId: string,
  userId: number,
  points: number,
): Promise<number> {
  await client.query(
    `INSERT INTO point_transactions (shop_id, user_id, amount, type)
     VALUES ($1::uuid, $2, $3, 'EARN'::point_tx_type_enum)`,
    [shopId, userId, points],
  );
  const balanceResult = await client.query<{ balance_point: string }>(
    `INSERT INTO user_shop_balances (user_id, shop_id, balance_point)
     VALUES ($1, $2::uuid, $3)
     ON CONFLICT (user_id, shop_id) DO UPDATE
     SET balance_point = user_shop_balances.balance_point + EXCLUDED.balance_point,
         updated_at = NOW()
     RETURNING balance_point::float8 AS balance_point`,
    [userId, shopId, points],
  );
  return Number(balanceResult.rows[0]?.balance_point ?? 0);
}

export function rethrowReferralBindError(err: unknown): never {
  if (isPgUniqueViolation(err)) {
    throw new ApiException('referral_already_bound', 'Referral code already bound.', 400);
  }
  throw err;
}
