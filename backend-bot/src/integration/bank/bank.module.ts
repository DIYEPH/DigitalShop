import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SepayGateway } from './sepay.gateway';
import { SEPAY_GATEWAY } from './bank.tokens';

@Module({
  providers: [
    {
      provide: SEPAY_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SepayGateway(
          config.get<string>('SEPAY_API_KEY', '') ?? '',
          config.get<string>('BANK_NAME', '') ?? '',
          config.get<string>('BANK_ACCOUNT', '') ?? '',
          config.get<string>('BANK_OWNER', '') ?? '',
          config.get<string>('BANK_BIN', '') ?? '',
        ),
    },
  ],
  exports: [SEPAY_GATEWAY],
})
export class BankIntegrationModule {}
