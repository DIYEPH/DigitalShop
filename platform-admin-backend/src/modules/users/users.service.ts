import { Injectable, NotFoundException } from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";

@Injectable()
export class UsersService {
  async list(search?: string) {
    const params: unknown[] = [];
    const where = search?.trim()
      ? `WHERE email ILIKE $1 OR username ILIKE $1 OR full_name ILIKE $1`
      : "";
    if (where) params.push(`%${search!.trim()}%`);
    const result = await getPgPool().query(
      `SELECT id, email, username, full_name, role::text, status::text, can_create_shop, created_at
       FROM users
       ${where}
       ORDER BY id DESC
       LIMIT 200`,
      params,
    );
    return { users: result.rows };
  }

  async setCanCreateShop(userId: number, allowed: boolean) {
    const result = await getPgPool().query(
      `UPDATE users
       SET can_create_shop = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, can_create_shop`,
      [userId, allowed],
    );
    if (!result.rows[0]) throw new NotFoundException("User not found");
    return result.rows[0];
  }

  async setStatus(userId: number, status: "ACTIVE" | "BANNED") {
    const result = await getPgPool().query(
      `UPDATE users
       SET status = $2::user_status_enum, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, status::text`,
      [userId, status],
    );
    if (!result.rows[0]) throw new NotFoundException("User not found");
    return result.rows[0];
  }
}
