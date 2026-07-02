import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenant/tenant.module";
import { ShopSettingsController } from "./shop-settings.controller";
import { ShopSettingsService } from "./shop-settings.service";

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [ShopSettingsController],
  providers: [ShopSettingsService],
})
export class ShopSettingsModule {}
