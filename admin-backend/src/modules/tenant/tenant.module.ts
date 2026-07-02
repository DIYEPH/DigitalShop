import { Module } from "@nestjs/common";
import { ShopTenantGuard } from "./guards/shop-tenant.guard";

@Module({
  providers: [ShopTenantGuard],
  exports: [ShopTenantGuard],
})
export class TenantModule {}
