import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { WebJwtGuard } from '../../common/guards/web-jwt.guard';

@Module({
  imports: [AuthModule],
  controllers: [MeController],
  providers: [MeService, WebJwtGuard],
})
export class MeModule {}
