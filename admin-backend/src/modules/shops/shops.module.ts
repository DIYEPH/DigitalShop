import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenant/tenant.module";
import { ShopsController } from "./shops.controller";
import { ShopsService } from "./shops.service";

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
