import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { BotShopId } from '../../../auth/presentation/decorators/bot-shop.decorator';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import { TelegramDailyLoginClaimDto } from '../../application/dto/telegram-daily-login.dto';
import { ClaimTelegramDailyLoginUseCase } from '../../application/use-cases/claim-telegram-daily-login.use-case';
import { GetTelegramDailyLoginStatusUseCase } from '../../application/use-cases/get-telegram-daily-login-status.use-case';

@Controller('point/telegram')
@UseGuards(BotSecretGuard)
export class PointTelegramController {
  constructor(
    private readonly getDailyStatusUseCase: GetTelegramDailyLoginStatusUseCase,
    private readonly claimDailyUseCase: ClaimTelegramDailyLoginUseCase,
  ) {}

  @Get('daily')
  async getDailyStatus(
    @BotShopId() shopId: string,
    @Query('telegram_id', ParseIntPipe) telegramId: number,
  ) {
    const data = await this.getDailyStatusUseCase.execute(shopId, telegramId);
    return { data };
  }

  @Post('daily/claim')
  async claimDaily(@BotShopId() shopId: string, @Body() body: TelegramDailyLoginClaimDto) {
    const data = await this.claimDailyUseCase.execute(shopId, Number(body.telegram_id));
    return { data };
  }
}
