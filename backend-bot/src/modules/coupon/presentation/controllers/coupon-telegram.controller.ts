import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BotShopId } from '../../../auth/presentation/decorators/bot-shop.decorator';
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
  async mine(@BotShopId() shopId: string, @Query() query: TelegramCouponMineQueryDto) {
    const data = await this.listMineUseCase.execute(shopId, query);
    return { data };
  }

  @Get('shop')
  async shop(@BotShopId() shopId: string) {
    const data = await this.listShopUseCase.execute(shopId);
    return { data };
  }

  @Post('redeem')
  async redeem(@BotShopId() shopId: string, @Body() body: TelegramCouponRedeemDto) {
    const data = await this.redeemUseCase.execute(shopId, body);
    return { data };
  }
}
