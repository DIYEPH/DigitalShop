import type { PoolClient } from 'pg';
import { ApiException } from '../../../../shared/errors/api.exception';

export function isPgUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export async function creditUserPoints(
  client: PoolClient,
  userId: number,
  points: number,
): Promise<number> {
  await client.query(
    `INSERT INTO point_transactions (user_id, amount, type)
     VALUES ($1, $2, 'EARN'::point_tx_type_enum)`,
    [userId, points],
  );
  const balanceResult = await client.query<{ balance_point: string }>(
    `UPDATE users
        SET balance_point = balance_point + $2, updated_at = NOW()
      WHERE id = $1
      RETURNING balance_point::float8 AS balance_point`,
    [userId, points],
  );
  return Number(balanceResult.rows[0]?.balance_point ?? 0);
}

export function rethrowReferralBindError(err: unknown): never {
  if (isPgUniqueViolation(err)) {
    throw new ApiException('referral_already_bound', 'Referral code already bound.', 400);
  }
  throw err;
}
