import { ApiException } from '../errors/api.exception';

interface Queryable {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * Registers the buyer as a CUSTOMER member of the shop on first contact.
 * Existing staff rows (OWNER/MANAGER/STAFF) are left untouched.
 */
export async function upsertShopCustomer(
  db: Queryable,
  shopId: string,
  userId: number,
): Promise<void> {
  await db.query(
    `INSERT INTO shop_members (shop_id, user_id, role)
     VALUES ($1::uuid, $2, 'CUSTOMER')
     ON CONFLICT (shop_id, user_id) DO NOTHING`,
    [shopId, userId],
  );
}

/** Throws when the shop has banned this customer; other shops are unaffected. */
export async function assertShopCustomerNotBanned(
  db: Queryable,
  shopId: string,
  userId: number,
): Promise<void> {
  const result = await db.query(
    `SELECT status::text AS status
     FROM shop_members
     WHERE shop_id = $1::uuid AND user_id = $2
     LIMIT 1`,
    [shopId, userId],
  );
  const status = result.rows[0]?.status;
  if (status === 'BANNED') {
    throw new ApiException('customer_banned', 'You are banned from this shop.', 403);
  }
}
