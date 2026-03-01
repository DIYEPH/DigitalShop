import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import { TelegramReferralBindDto } from '../../application/dto/telegram-referral.dto';
import { BindTelegramReferralUseCase } from '../../application/use-cases/bind-telegram-referral.use-case';
import { GetTelegramReferralMeUseCase } from '../../application/use-cases/get-telegram-referral-me.use-case';

@Controller('referral/telegram')
@UseGuards(BotSecretGuard)
export class ReferralTelegramController {
  constructor(
    private readonly getReferralMeUseCase: GetTelegramReferralMeUseCase,
    private readonly bindReferralUseCase: BindTelegramReferralUseCase,
  ) {}

  @Get('me')
  async getMe(@Query('telegram_id', ParseIntPipe) telegramId: number) {
    const data = await this.getReferralMeUseCase.execute(telegramId);
    return { data };
  }

  @Post('bind')
  async bind(@Body() body: TelegramReferralBindDto) {
    const data = await this.bindReferralUseCase.execute(body);
    return { data };
  }
}
