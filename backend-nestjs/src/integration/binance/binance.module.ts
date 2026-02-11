import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BinancePayGateway } from './binance-pay.gateway';
import { BINANCE_PAY_GATEWAY } from './binance.tokens';

@Module({
  providers: [
    {
      provide: BINANCE_PAY_GATEWAY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BinancePayGateway(
          config.get<string>('BINANCE_API_KEY', '') ?? '',
          config.get<string>('BINANCE_SECRET_KEY', '') ?? '',
          config.get<string>('BINANCE_PAY_ID', '') ?? '',
          config.get<string>('BINANCE_PAY_QR_URL', '') ?? '',
        ),
    },
  ],
  exports: [BINANCE_PAY_GATEWAY],
})
export class BinanceIntegrationModule {}
