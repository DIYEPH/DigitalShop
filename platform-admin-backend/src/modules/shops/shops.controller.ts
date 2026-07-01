import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { PlatformAdminGuard } from "../auth/platform-admin.guard";
import { ShopsService } from "./shops.service";

class SetShopStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED", "ARCHIVED"])
  status!: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
}

@ApiTags("Shops")
@ApiBearerAuth("access-token")
@UseGuards(PlatformAdminGuard)
@Controller("shops")
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list() {
    return this.shopsService.list();
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: SetShopStatusDto) {
    return this.shopsService.setStatus(id, dto.status);
  }
}
