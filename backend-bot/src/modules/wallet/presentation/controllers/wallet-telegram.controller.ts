import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { BotShopId } from '../../../auth/presentation/decorators/bot-shop.decorator';
import { BotSecretGuard } from '../../../auth/presentation/guards/bot-secret.guard';
import { CancelTopupUseCase } from '../../application/use-cases/cancel-topup.use-case';
import { CreateBankTelegramTopupUseCase } from '../../application/use-cases/create-bank-topup.use-case';
import { CreateBinanceTelegramTopupUseCase } from '../../application/use-cases/create-binance-topup.use-case';
import { GetTopupStatusUseCase } from '../../application/use-cases/get-topup-status.use-case';
import {
  TelegramTopupBankCreateDto,
  TelegramTopupBinanceCreateDto,
  TelegramTopupCancelDto,
} from '../../application/dto/telegram-topup.dto';

@Controller('wallet/telegram')
@UseGuards(BotSecretGuard)
export class WalletTelegramController {
  constructor(
    private readonly createBinanceTopupUseCase: CreateBinanceTelegramTopupUseCase,
    private readonly createBankTopupUseCase: CreateBankTelegramTopupUseCase,
    private readonly getTopupStatusUseCase: GetTopupStatusUseCase,
    private readonly cancelTopupUseCase: CancelTopupUseCase,
  ) {}

  @Post('topup/binance')
  async createBinanceTopup(
    @BotShopId() shopId: string,
    @Body() body: TelegramTopupBinanceCreateDto,
  ) {
    const data = await this.createBinanceTopupUseCase.execute(shopId, body);
    return { data };
  }

  @Post('topup/bank')
  async createBankTopup(
    @BotShopId() shopId: string,
    @Body() body: TelegramTopupBankCreateDto,
  ) {
    const data = await this.createBankTopupUseCase.execute(shopId, body);
    return { data };
  }

  @Get('topup/:id/status')
  async getStatus(
    @BotShopId() shopId: string,
    @Param('id', ParseIntPipe) id: number,
    @Query('telegram_id', ParseIntPipe) telegramId: number,
  ) {
    const data = await this.getTopupStatusUseCase.execute(shopId, id, telegramId);
    return { data };
  }

  @Post('topup/:id/cancel')
  async cancel(
    @BotShopId() shopId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: TelegramTopupCancelDto,
  ) {
    await this.cancelTopupUseCase.execute(shopId, id, Number(body.telegram_id));
    return { data: { cancelled: true } };
  }
}
