import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { TelegramLoginUseCase } from './application/use-cases/telegram-login.use-case';
import { BotSecretGuard } from './presentation/guards/bot-secret.guard';
import { AUTH_USER_REPOSITORY } from './auth.tokens';
import { PgAuthUserRepository } from './infrastructure/persistence/repositories/pg-auth-user.repository';
import { GetTelegramMeUseCase } from './application/use-cases/get-telegram-me.use-case';
import { SetTelegramLanguageUseCase } from './application/use-cases/set-telegram-language.use-case';

@Module({
  controllers: [AuthController],
  providers: [
    TelegramLoginUseCase,
    GetTelegramMeUseCase,
    SetTelegramLanguageUseCase,
    BotSecretGuard,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: PgAuthUserRepository,
    },
  ],
})
export class AuthModule {}
