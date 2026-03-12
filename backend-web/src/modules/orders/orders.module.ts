import { Module } from '@nestjs/common';
import { WebJwtGuard } from '../../common/guards/web-jwt.guard';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, WebJwtGuard],
})
export class OrdersModule {}
