import { Pool } from 'pg';

const SEED_PAYMENT_METHODS = ['BINANCE', 'BALANCE', 'BALANCE_VND', 'CRYPTO', 'BANK'];

export function createE2ePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for e2e DB helpers');
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function cancelPendingOrdersForTelegram(
  pool: Pool,
  telegramId: number,
): Promise<void> {
  await pool.query(
    `UPDATE stock_items si
      SET status = 'AVAILABLE',
          is_locked = false,
          order_id = NULL,
          reserved_at = NULL,
          updated_at = NOW()
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      WHERE si.order_id = o.id
        AND si.status = 'RESERVED'
        AND u.telegram_id = $1
        AND o.status = 'PENDING'`,
    [telegramId],
  );
  await pool.query(
    `UPDATE orders o
      SET status = 'CANCELLED', updated_at = NOW()
      FROM users u
      WHERE o.user_id = u.id
        AND u.telegram_id = $1
        AND o.status = 'PENDING'`,
    [telegramId],
  );
}

/** Đưa stock seed (note=seed) về AVAILABLE — dùng giữa các suite e2e. */
export async function restoreSeedStockForVariant(pool: Pool, variantId: number): Promise<void> {
  await pool.query(
    `UPDATE stock_items
      SET status = 'AVAILABLE',
          is_locked = false,
          order_id = NULL,
          reserved_at = NULL,
          delivered_at = NULL,
          updated_at = NOW()
      WHERE variant_id = $1
        AND note = 'seed'`,
    [variantId],
  );
}

export async function backdateOrderCreatedAt(
  pool: Pool,
  orderId: string,
  minutesAgo: number,
): Promise<void> {
  await pool.query(
    `UPDATE orders
      SET created_at = NOW() - ($2::int * INTERVAL '1 minute'), updated_at = NOW()
      WHERE id = $1::uuid`,
    [orderId, minutesAgo],
  );
}

export async function countReservedStockForOrder(
  pool: Pool,
  orderId: string,
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
      FROM stock_items
      WHERE order_id = $1::uuid AND status = 'RESERVED'`,
    [orderId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countAvailableStock(pool: Pool, variantId: number): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
      FROM stock_items
      WHERE variant_id = $1 AND status = 'AVAILABLE'`,
    [variantId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function fetchOrderDb(pool: Pool, orderId: string) {
  const orderResult = await pool.query(
    `SELECT id::text, user_id, payment_code, total_price::float8, currency::text,
            payment_method::text, status::text
      FROM orders WHERE id = $1::uuid`,
    [orderId],
  );
  const itemsResult = await pool.query(
    `SELECT variant_id, quantity, unit_price::float8, snapshot_variant_name,
            snapshot_fulfillment_type::text, snapshot_warranty_type::text
      FROM order_items WHERE order_id = $1::uuid`,
    [orderId],
  );
  return {
    order: orderResult.rows[0] ?? null,
    items: itemsResult.rows,
  };
}

export async function setVariantPaymentMethods(
  pool: Pool,
  variantId: number,
  methods: string[],
): Promise<void> {
  await pool.query(
    `UPDATE product_variants
      SET payment_methods = $2::product_payment_method_enum[], updated_at = NOW()
      WHERE id = $1`,
    [variantId, methods],
  );
}

export async function restoreSeedVariantPaymentMethods(pool: Pool, variantId: number): Promise<void> {
  await setVariantPaymentMethods(pool, variantId, SEED_PAYMENT_METHODS);
}

export async function setUserBalance(
  pool: Pool,
  telegramId: number,
  balanceUsdt: number,
  balanceVnd: number,
): Promise<void> {
  await pool.query(
    `UPDATE users SET balance_usdt = $2, balance_vnd = $3, updated_at = NOW()
      WHERE telegram_id = $1`,
    [telegramId, balanceUsdt, balanceVnd],
  );
}

export async function cancelPendingTopupsForTelegram(pool: Pool, telegramId: number): Promise<void> {
  await pool.query(
    `UPDATE balance_topups
      SET status = 'FAILED', updated_at = NOW()
      WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1 LIMIT 1)
        AND status = 'PENDING'`,
    [telegramId],
  );
}

export async function getUserBalance(
  pool: Pool,
  telegramId: number,
): Promise<{ balanceUsdt: number; balanceVnd: number } | null> {
  const result = await pool.query<{ balance_usdt: string; balance_vnd: string }>(
    `SELECT balance_usdt, balance_vnd FROM users WHERE telegram_id = $1`,
    [telegramId],
  );
  if (!result.rows[0]) return null;
  return {
    balanceUsdt: Number(result.rows[0].balance_usdt),
    balanceVnd: Number(result.rows[0].balance_vnd),
  };
}

export async function getUserBalancePoint(pool: Pool, telegramId: number): Promise<number | null> {
  const result = await pool.query<{ balance_point: string }>(
    `SELECT balance_point FROM users WHERE telegram_id = $1`,
    [telegramId],
  );
  if (!result.rows[0]) return null;
  return Number(result.rows[0].balance_point);
}

export async function clearDailyLoginClaimsForTelegram(pool: Pool, telegramId: number): Promise<void> {
  await pool.query(
    `DELETE FROM daily_login_point_claims
      WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1 LIMIT 1)`,
    [telegramId],
  );
}

export async function clearReferralBindingForTelegram(pool: Pool, telegramId: number): Promise<void> {
  await pool.query(
    `DELETE FROM referrals
      WHERE referred_user_id = (SELECT id FROM users WHERE telegram_id = $1 LIMIT 1)
         OR referrer_user_id = (SELECT id FROM users WHERE telegram_id = $1 LIMIT 1)`,
    [telegramId],
  );
  await pool.query(
    `UPDATE users SET referred_by_user_id = NULL WHERE telegram_id = $1`,
    [telegramId],
  );
}

export async function getReferralCodeForTelegram(
  pool: Pool,
  telegramId: number,
): Promise<string | null> {
  const result = await pool.query<{ referral_code: string }>(
    `SELECT referral_code FROM users WHERE telegram_id = $1`,
    [telegramId],
  );
  return result.rows[0]?.referral_code ?? null;
}
