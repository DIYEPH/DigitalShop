import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly } from "../../common/decorators/admin-only.decorator";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@Controller("users")
@AdminOnly()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List users (admin)" })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Patch(":id/role")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Promote user to ADMIN (USER → ADMIN only)" })
  updateRole(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ban or unban USER accounts" })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
