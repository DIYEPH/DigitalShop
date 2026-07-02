import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { AdminJwtGuard } from "../../modules/auth/guards/admin-jwt.guard";
import { ShopTenantGuard } from "../../modules/tenant/guards/shop-tenant.guard";

export function ShopScoped() {
  return applyDecorators(
    UseGuards(AdminJwtGuard, ShopTenantGuard),
    ApiBearerAuth("access-token"),
    ApiHeader({
      name: "X-Shop-Id",
      required: true,
      description: "Active shop id for seller-scoped APIs",
    }),
  );
}
