import { Module } from '@nestjs/common';
import { ShopPaymentGatewaysService } from './shop-payment-gateways.service';

@Module({
  providers: [ShopPaymentGatewaysService],
  exports: [ShopPaymentGatewaysService],
})
export class ShopPaymentModule {}
