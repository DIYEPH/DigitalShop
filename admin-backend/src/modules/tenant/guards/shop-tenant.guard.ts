import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { getPgPool } from "../../../common/database/pg-pool";
import { ErrorCodes } from "../../../common/enums/error-codes.enum";
import { AdminUser } from "../../auth/types/admin-user";
import { CurrentShop } from "../types/current-shop";

type TenantRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: AdminUser;
  tenant?: CurrentShop;
};

@Injectable()
export class ShopTenantGuard implements CanActivate {
  private get pool() {
    return getPgPool();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Authentication required",
      });
    }

    const shopId = this.readShopId(request.headers["x-shop-id"]);
    if (!shopId) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_REQUIRED,
        message: "X-Shop-Id header is required",
      });
    }

    const result = await this.pool.query<{
      id: string;
      name: string;
      slug: string;
      status: string;
      member_role: string;
    }>(
      `SELECT
          s.id::text,
          s.name,
          s.slug,
          s.status::text AS status,
          sm.role::text AS member_role
       FROM shop_members sm
       INNER JOIN shops s ON s.id = sm.shop_id
       WHERE sm.user_id = $1 AND sm.shop_id = $2::uuid AND sm.role <> 'CUSTOMER'
       LIMIT 1`,
      [user.id, shopId],
    );

    const row = result.rows[0];
    if (!row) {
      const exists = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM shops WHERE id = $1::uuid) AS exists`,
        [shopId],
      );
      if (!exists.rows[0]?.exists) {
        throw new NotFoundException({
          code: ErrorCodes.TENANT_SHOP_NOT_FOUND,
          message: "Shop not found",
        });
      }
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "You do not have access to this shop",
      });
    }

    request.tenant = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      member_role: row.member_role as CurrentShop["member_role"],
    };
    return true;
  }

  private readShopId(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0]?.trim() || null;
    return value?.trim() || null;
  }
}
