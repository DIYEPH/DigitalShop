import { Module } from '@nestjs/common';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { ClaimTelegramDailyLoginUseCase } from './application/use-cases/claim-telegram-daily-login.use-case';
import { GetTelegramDailyLoginStatusUseCase } from './application/use-cases/get-telegram-daily-login-status.use-case';
import { PgPointRepository } from './infrastructure/persistence/repositories/pg-point.repository';
import { PointTelegramController } from './presentation/controllers/point-telegram.controller';
import { POINT_REPOSITORY } from './point.tokens';

@Module({
  controllers: [PointTelegramController],
  providers: [
    GetTelegramDailyLoginStatusUseCase,
    ClaimTelegramDailyLoginUseCase,
    BotSecretGuard,
    {
      provide: POINT_REPOSITORY,
      useClass: PgPointRepository,
    },
  ],
})
export class PointModule {}
