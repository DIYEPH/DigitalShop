import { Module } from '@nestjs/common';
import { BankIntegrationModule } from '../../integration/bank/bank.module';
import { BinanceIntegrationModule } from '../../integration/binance/binance.module';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { CancelTopupUseCase } from './application/use-cases/cancel-topup.use-case';
import { CreateBankTelegramTopupUseCase } from './application/use-cases/create-bank-topup.use-case';
import { CreateBinanceTelegramTopupUseCase } from './application/use-cases/create-binance-topup.use-case';
import { GetTopupStatusUseCase } from './application/use-cases/get-topup-status.use-case';
import { ProcessBankTelegramTopupUseCase } from './application/use-cases/process-bank-topup.use-case';
import { ProcessBinanceTelegramTopupUseCase } from './application/use-cases/process-binance-topup.use-case';
import { WalletSyncService } from './infrastructure/jobs/wallet-sync.service';
import { PgTopupRepository } from './infrastructure/persistence/repositories/pg-topup.repository';
import { WalletTelegramController } from './presentation/controllers/wallet-telegram.controller';
import { TOPUP_REPOSITORY } from './wallet.tokens';

@Module({
  imports: [BankIntegrationModule, BinanceIntegrationModule],
  controllers: [WalletTelegramController],
  providers: [
    CreateBinanceTelegramTopupUseCase,
    CreateBankTelegramTopupUseCase,
    GetTopupStatusUseCase,
    CancelTopupUseCase,
    ProcessBinanceTelegramTopupUseCase,
    ProcessBankTelegramTopupUseCase,
    WalletSyncService,
    BotSecretGuard,
    {
      provide: TOPUP_REPOSITORY,
      useClass: PgTopupRepository,
    },
  ],
})
export class WalletModule {}
