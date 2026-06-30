import { Module } from '@nestjs/common';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { BindTelegramReferralUseCase } from './application/use-cases/bind-telegram-referral.use-case';
import { GetTelegramReferralMeUseCase } from './application/use-cases/get-telegram-referral-me.use-case';
import { PgReferralRepository } from './infrastructure/persistence/repositories/pg-referral.repository';
import { ReferralTelegramController } from './presentation/controllers/referral-telegram.controller';
import { REFERRAL_REPOSITORY } from './referral.tokens';

@Module({
  controllers: [ReferralTelegramController],
  providers: [
    GetTelegramReferralMeUseCase,
    BindTelegramReferralUseCase,
    BotSecretGuard,
    {
      provide: REFERRAL_REPOSITORY,
      useClass: PgReferralRepository,
    },
  ],
})
export class ReferralModule {}
