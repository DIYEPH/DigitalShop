import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AdminOnly } from "../../common/decorators/admin-only.decorator";
import { CurrentAdmin } from "../../common/decorators/current-admin.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AdminUser } from "./types/admin-user";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin login" })
  @ApiResponse({ status: 200, description: "Login successful" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get("me")
  @AdminOnly()
  @ApiOperation({ summary: "Current admin profile" })
  async me(@CurrentAdmin() admin: AdminUser) {
    return this.authService.getProfile(admin.id);
  }

  @Post("logout")
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin logout (client removes token)" })
  logout() {
    return { message: "Logged out successfully" };
  }

  @Put("change-password")
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change admin password" })
  async changePassword(
    @CurrentAdmin() admin: AdminUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      admin.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: "Password updated successfully" };
  }
}
