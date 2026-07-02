import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsIn } from "class-validator";
import { PlatformAdminGuard } from "../auth/platform-admin.guard";
import { UsersService } from "./users.service";

class SetCanCreateShopDto {
  @IsBoolean()
  allowed!: boolean;
}

class SetUserStatusDto {
  @IsIn(["ACTIVE", "BANNED"])
  status!: "ACTIVE" | "BANNED";
}

@ApiTags("Users")
@ApiBearerAuth("access-token")
@UseGuards(PlatformAdminGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.usersService.list(search);
  }

  @Patch(":id/can-create-shop")
  setCanCreateShop(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SetCanCreateShopDto,
  ) {
    return this.usersService.setCanCreateShop(id, dto.allowed);
  }

  @Patch(":id/status")
  setStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: SetUserStatusDto) {
    return this.usersService.setStatus(id, dto.status);
  }
}
