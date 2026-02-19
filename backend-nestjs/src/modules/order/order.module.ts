import { Module } from '@nestjs/common';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { CouponModule } from '../coupon/coupon.module';
import { BankIntegrationModule } from '../../integration/bank/bank.module';
import { BinanceIntegrationModule } from '../../integration/binance/binance.module';
import { CancelTelegramOrderUseCase } from './application/use-cases/cancel-telegram-order.use-case';
import { CheckTelegramOrderPaymentUseCase } from './application/use-cases/check-telegram-order-payment.use-case';
import { CreateTelegramOrderUseCase } from './application/use-cases/create-telegram-order.use-case';
import { GetPendingTelegramOrderUseCase } from './application/use-cases/get-pending-telegram-order.use-case';
import { GetTelegramOrderDetailUseCase } from './application/use-cases/get-telegram-order-detail.use-case';
import { GetTelegramOrderPaymentUseCase } from './application/use-cases/get-telegram-order-payment.use-case';
import { ListTelegramOrdersUseCase } from './application/use-cases/list-telegram-orders.use-case';
import { ProcessBankOrderPaymentUseCase } from './application/use-cases/process-bank-order-payment.use-case';
import { ProcessBinanceOrderPaymentUseCase } from './application/use-cases/process-binance-order-payment.use-case';
import { QuoteTelegramOrderUseCase } from './application/use-cases/quote-telegram-order.use-case';
import { PendingOrderSyncService } from './infrastructure/jobs/pending-order-sync.service';
import { PgOrderRepository } from './infrastructure/persistence/repositories/pg-order.repository';
import { ORDER_REPOSITORY } from './order.tokens';
import { OrderTelegramController } from './presentation/controllers/order-telegram.controller';

@Module({
  imports: [CouponModule, BankIntegrationModule, BinanceIntegrationModule],
  controllers: [OrderTelegramController],
  providers: [
    QuoteTelegramOrderUseCase,
    CreateTelegramOrderUseCase,
    GetPendingTelegramOrderUseCase,
    CancelTelegramOrderUseCase,
    GetTelegramOrderPaymentUseCase,
    CheckTelegramOrderPaymentUseCase,
    ListTelegramOrdersUseCase,
    GetTelegramOrderDetailUseCase,
    ProcessBinanceOrderPaymentUseCase,
    ProcessBankOrderPaymentUseCase,
    PendingOrderSyncService,
    BotSecretGuard,
    {
      provide: ORDER_REPOSITORY,
      useClass: PgOrderRepository,
    },
  ],
})
export class OrderModule {}
