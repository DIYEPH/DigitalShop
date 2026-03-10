import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebJwtGuard } from '../../common/guards/web-jwt.guard';
import { AuthUser } from '../auth/types/auth-user';
import { ChangePasswordDto, UpdateProfileDto } from './dto/me.dto';
import { MeService } from './me.service';

@Controller('me')
@UseGuards(WebJwtGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.meService.getProfile(user.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.meService.updateProfile(user.id, dto.email);
  }

  @Put('password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.meService.changePassword(user.id, dto.current_password, dto.new_password);
  }

  @Get('points/daily-login')
  getDailyLoginStatus(@CurrentUser() user: AuthUser) {
    return this.meService.getDailyLoginStatus(user.id);
  }

  @Post('points/daily-login/claim')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  claimDailyLogin(@CurrentUser() user: AuthUser) {
    return this.meService.claimDailyLogin(user.id);
  }

  @Get('points/daily-login/month-history')
  getDailyLoginMonthHistory(@CurrentUser() user: AuthUser) {
    return this.meService.getDailyLoginMonthHistory(user.id);
  }
}
