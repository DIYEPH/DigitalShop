import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { AdminUser } from "../auth/types/admin-user";
import { CurrentShop } from "../tenant/types/current-shop";
import {
  AddShopMemberDto,
  CreateShopDto,
  SelectShopCategoriesDto,
  UpdateShopDto,
} from "./dto/create-shop.dto";

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  support_url: string | null;
  member_role: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ShopsService {
  private get pool() {
    return getPgPool();
  }

  async listForUser(userId: number) {
    const result = await this.pool.query<ShopRow>(
      `SELECT
          s.id::text,
          s.name,
          s.slug,
          s.status::text AS status,
          s.logo_url,
          s.support_url,
          sm.role::text AS member_role,
          s.created_at,
          s.updated_at
       FROM shop_members sm
       INNER JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1
       ORDER BY s.created_at ASC`,
      [userId],
    );
    return { shops: result.rows.map(this.toShopResponse) };
  }

  async create(user: AdminUser, dto: CreateShopDto) {
    if (!user.can_create_shop) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "You are not allowed to create a shop",
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query<
        Omit<ShopRow, "member_role"> & { owner_user_id: number | null }
      >(
        `INSERT INTO shops (owner_user_id, name, slug, logo_url, support_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, owner_user_id, name, slug, status::text AS status,
                   logo_url, support_url, created_at, updated_at`,
        [
          user.id,
          dto.name.trim(),
          dto.slug.trim().toLowerCase(),
          dto.logo_url ?? null,
          dto.support_url ?? null,
        ],
      );

      const shop = result.rows[0];
      await client.query(
        `INSERT INTO shop_members (shop_id, user_id, role)
         VALUES ($1::uuid, $2, 'OWNER')`,
        [shop.id, user.id],
      );
      await client.query(
        `UPDATE users SET can_create_shop = FALSE, updated_at = NOW() WHERE id = $1`,
        [user.id],
      );

      await client.query("COMMIT");
      return this.toShopResponse({ ...shop, member_role: "OWNER" });
    } catch (error) {
      await client.query("ROLLBACK");
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Shop slug already exists",
        });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async update(currentShop: CurrentShop, shopId: string, dto: UpdateShopDto) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertManager(currentShop);

    const result = await this.pool.query<ShopRow>(
      `UPDATE shops
       SET name = COALESCE($2, name),
           logo_url = COALESCE($3, logo_url),
           support_url = COALESCE($4, support_url),
           updated_at = NOW()
       WHERE id = $1::uuid
       RETURNING id::text, name, slug, status::text AS status,
                 logo_url, support_url, created_at, updated_at`,
      [shopId, dto.name?.trim() || null, dto.logo_url ?? null, dto.support_url ?? null],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.TENANT_SHOP_NOT_FOUND,
        message: "Shop not found",
      });
    }
    return this.toShopResponse({ ...row, member_role: currentShop.member_role });
  }

  async listMembers(currentShop: CurrentShop, shopId: string) {
    this.assertCurrentShop(currentShop, shopId);
    const result = await this.pool.query<{
      user_id: number;
      email: string | null;
      full_name: string | null;
      role: string;
      created_at: Date;
    }>(
      `SELECT
          sm.user_id,
          u.email,
          u.full_name,
          sm.role::text AS role,
          sm.created_at
       FROM shop_members sm
       INNER JOIN users u ON u.id = sm.user_id
       WHERE sm.shop_id = $1::uuid
       ORDER BY sm.created_at ASC`,
      [shopId],
    );
    return { members: result.rows };
  }

  async addMember(currentShop: CurrentShop, shopId: string, dto: AddShopMemberDto) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertOwner(currentShop);

    const user = await this.pool.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [dto.user_id],
    );
    if (!user.rows[0]) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: "User not found",
      });
    }

    await this.pool.query(
      `INSERT INTO shop_members (shop_id, user_id, role)
       VALUES ($1::uuid, $2, $3::shop_member_role_enum)
       ON CONFLICT (shop_id, user_id) DO UPDATE SET
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [shopId, dto.user_id, dto.role],
    );
    return this.listMembers(currentShop, shopId);
  }

  async removeMember(currentShop: CurrentShop, shopId: string, userId: number) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertOwner(currentShop);
    if (userId <= 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Invalid user id",
      });
    }

    await this.pool.query(
      `DELETE FROM shop_members
       WHERE shop_id = $1::uuid
         AND user_id = $2
         AND role <> 'OWNER'`,
      [shopId, userId],
    );
    return this.listMembers(currentShop, shopId);
  }

  async listCategories(currentShop: CurrentShop, shopId: string) {
    this.assertCurrentShop(currentShop, shopId);
    const result = await this.pool.query<{
      id: number;
      name_en: string;
      name_vi: string;
      slug: string;
      is_selected: boolean;
    }>(
      `SELECT
          c.id,
          c.name_en,
          c.name_vi,
          c.slug,
          (sc.shop_id IS NOT NULL) AS is_selected
       FROM categories c
       LEFT JOIN shop_categories sc
         ON sc.category_id = c.id AND sc.shop_id = $1::uuid
       WHERE c.is_active = TRUE
       ORDER BY c.sort_order ASC, c.id ASC`,
      [shopId],
    );
    return { categories: result.rows };
  }

  async selectCategories(
    currentShop: CurrentShop,
    shopId: string,
    dto: SelectShopCategoriesDto,
  ) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertManager(currentShop);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM shop_categories WHERE shop_id = $1::uuid`, [shopId]);
      for (const categoryId of dto.category_ids) {
        await client.query(
          `INSERT INTO shop_categories (shop_id, category_id)
           SELECT $1::uuid, id FROM categories WHERE id = $2 AND is_active = TRUE
           ON CONFLICT (shop_id, category_id) DO NOTHING`,
          [shopId, categoryId],
        );
      }
      await client.query("COMMIT");
      return this.listCategories(currentShop, shopId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private assertCurrentShop(currentShop: CurrentShop, shopId: string) {
    if (currentShop.id !== shopId) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "X-Shop-Id does not match the requested shop",
      });
    }
  }

  private assertOwner(currentShop: CurrentShop) {
    if (currentShop.member_role !== "OWNER") {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_OWNER_REQUIRED,
        message: "Shop owner role is required",
      });
    }
  }

  private assertManager(currentShop: CurrentShop) {
    if (!["OWNER", "MANAGER"].includes(currentShop.member_role)) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "Shop owner or manager role is required",
      });
    }
  }

  private toShopResponse(row: ShopRow) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      logo_url: row.logo_url,
      support_url: row.support_url,
      member_role: row.member_role,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
  }
}
