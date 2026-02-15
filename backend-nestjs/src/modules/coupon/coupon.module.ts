import { Module } from '@nestjs/common';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { ListTelegramCouponMineUseCase } from './application/use-cases/list-telegram-coupon-mine.use-case';
import { ListTelegramCouponShopUseCase } from './application/use-cases/list-telegram-coupon-shop.use-case';
import { RedeemTelegramCouponUseCase } from './application/use-cases/redeem-telegram-coupon.use-case';
import { PgCouponRepository } from './infrastructure/persistence/repositories/pg-coupon.repository';
import { CouponTelegramController } from './presentation/controllers/coupon-telegram.controller';
import { COUPON_REPOSITORY } from './coupon.tokens';

@Module({
  controllers: [CouponTelegramController],
  providers: [
    ListTelegramCouponMineUseCase,
    ListTelegramCouponShopUseCase,
    RedeemTelegramCouponUseCase,
    BotSecretGuard,
    {
      provide: COUPON_REPOSITORY,
      useClass: PgCouponRepository,
    },
  ],
  exports: [COUPON_REPOSITORY],
})
export class CouponModule {}
