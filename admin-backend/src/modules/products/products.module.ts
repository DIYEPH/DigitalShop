import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductPlansController } from './product-plans.controller';
import { ProductVariantsController } from './product-variants.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { VolumeTiersController } from './volume-tiers.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    VolumeTiersController,
    ProductVariantsController,
    ProductPlansController,
    ProductsController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
