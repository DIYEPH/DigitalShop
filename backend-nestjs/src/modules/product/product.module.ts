import { Module } from '@nestjs/common';
import { BankIntegrationModule } from '../../integration/bank/bank.module';
import { BotSecretGuard } from '../auth/presentation/guards/bot-secret.guard';
import { GetTelegramProductDetailUseCase } from './application/use-cases/get-telegram-product-detail.use-case';
import { ListTelegramProductsUseCase } from './application/use-cases/list-telegram-products.use-case';
import { PgProductRepository } from './infrastructure/persistence/repositories/pg-product.repository';
import { ProductTelegramController } from './presentation/controllers/product-telegram.controller';
import { PRODUCT_REPOSITORY } from './product.tokens';

@Module({
  imports: [BankIntegrationModule],
  controllers: [ProductTelegramController],
  providers: [
    ListTelegramProductsUseCase,
    GetTelegramProductDetailUseCase,
    BotSecretGuard,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PgProductRepository,
    },
  ],
})
export class ProductModule {}
