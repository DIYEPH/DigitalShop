import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PointModule } from './modules/point/point.module';
import { ReferralModule } from './modules/referral/referral.module';
import { CouponModule } from './modules/coupon/coupon.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    AuthModule,
    ProductModule,
    OrderModule,
    WalletModule,
    PointModule,
    ReferralModule,
    CouponModule,
  ],
})
export class AppModule {}
