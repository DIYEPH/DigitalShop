import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
