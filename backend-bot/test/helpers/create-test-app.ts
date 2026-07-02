import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { ShopPaymentGatewaysService } from '../../src/integration/shop-payment/shop-payment-gateways.service';
import { SepayTransaction } from '../../src/integration/bank/sepay.gateway';
import { createMockSepayGateway } from './mock-sepay.gateway';

// E2E must not start bot runner workers.
process.env.BOT_RUNNER_ENABLED = 'false';

export type CreateTestAppOptions = {
  /** Supplier giao dịch SePay giả lập (có thể mutate sau khi tạo topup). */
  sepayTransactions?: () => SepayTransaction[];
};

/** Keeps the real per-shop Binance gateway; replaces SePay with a mock. */
function createMockShopPaymentGateways(
  getTransactions: () => SepayTransaction[],
): ShopPaymentGatewaysService {
  const real = new ShopPaymentGatewaysService();
  const mockSepay = createMockSepayGateway(getTransactions);
  return {
    getBinance: (shopId: string) => real.getBinance(shopId),
    getSepay: async () => mockSepay,
  } as unknown as ShopPaymentGatewaysService;
}

function configureTestModule(options?: CreateTestAppOptions): TestingModuleBuilder {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options?.sepayTransactions) {
    builder = builder.overrideProvider(ShopPaymentGatewaysService).useValue(
      createMockShopPaymentGateways(options.sepayTransactions),
    );
  }
  return builder;
}

export async function createTestApp(options?: CreateTestAppOptions): Promise<INestApplication> {
  const moduleRef = await configureTestModule(options).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app;
}

export function botHeaders(): Record<string, string> {
  const secret = process.env.BOT_INTERNAL_SECRET;
  if (!secret) {
    throw new Error('BOT_INTERNAL_SECRET is required for e2e tests (set in backend-bot/.env).');
  }
  return { 'x-bot-secret': secret };
}
