import { Injectable, NotFoundException } from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";

@Injectable()
export class ShopsService {
  async list() {
    const result = await getPgPool().query(
      `SELECT
          s.id::text,
          s.name,
          s.slug,
          s.status::text,
          s.owner_user_id,
          u.email AS owner_email,
          s.created_at,
          s.updated_at
       FROM shops s
       LEFT JOIN users u ON u.id = s.owner_user_id
       ORDER BY s.created_at DESC
       LIMIT 200`,
    );
    return { shops: result.rows };
  }

  async setStatus(shopId: string, status: "ACTIVE" | "SUSPENDED" | "ARCHIVED") {
    const result = await getPgPool().query(
      `UPDATE shops
       SET status = $2::shop_status_enum, updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id::text, name, slug, status::text`,
      [shopId, status],
    );
    if (!result.rows[0]) throw new NotFoundException("Shop not found");
    return result.rows[0];
  }
}
