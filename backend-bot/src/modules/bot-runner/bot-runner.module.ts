import { Module } from '@nestjs/common';
import { BotRunnerManagerService } from './bot-runner-manager.service';

@Module({
  providers: [BotRunnerManagerService],
})
export class BotRunnerModule {}
