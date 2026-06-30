import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { SEPAY_GATEWAY } from '../../src/integration/bank/bank.tokens';
import { SepayTransaction } from '../../src/integration/bank/sepay.gateway';
import { createMockSepayGateway } from './mock-sepay.gateway';

export type CreateTestAppOptions = {
  /** Supplier giao dịch SePay giả lập (có thể mutate sau khi tạo topup). */
  sepayTransactions?: () => SepayTransaction[];
};

function configureTestModule(options?: CreateTestAppOptions): TestingModuleBuilder {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options?.sepayTransactions) {
    builder = builder.overrideProvider(SEPAY_GATEWAY).useValue(
      createMockSepayGateway(options.sepayTransactions),
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
