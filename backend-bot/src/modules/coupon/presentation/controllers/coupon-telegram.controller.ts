import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import {
  TelegramCouponMineQueryDto,
  TelegramCouponRedeemDto,
} from '../../application/dto/telegram-coupon.dto';
import { ListTelegramCouponMineUseCase } from '../../application/use-cases/list-telegram-coupon-mine.use-case';
import { ListTelegramCouponShopUseCase } from '../../application/use-cases/list-telegram-coupon-shop.use-case';
import { RedeemTelegramCouponUseCase } from '../../application/use-cases/redeem-telegram-coupon.use-case';

@Controller('coupon/telegram')
@UseGuards(BotSecretGuard)
export class CouponTelegramController {
  constructor(
    private readonly listMineUseCase: ListTelegramCouponMineUseCase,
    private readonly listShopUseCase: ListTelegramCouponShopUseCase,
    private readonly redeemUseCase: RedeemTelegramCouponUseCase,
  ) {}

  @Get('mine')
  async mine(@Query() query: TelegramCouponMineQueryDto) {
    const data = await this.listMineUseCase.execute(query);
    return { data };
  }

  @Get('shop')
  async shop() {
    const data = await this.listShopUseCase.execute();
    return { data };
  }

  @Post('redeem')
  async redeem(@Body() body: TelegramCouponRedeemDto) {
    const data = await this.redeemUseCase.execute(body);
    return { data };
  }
}
