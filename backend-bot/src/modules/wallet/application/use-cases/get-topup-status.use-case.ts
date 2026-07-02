import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupRepository } from '../../domain/repositories/topup.repository';
import { TelegramTopupStatusDto } from '../dto/telegram-topup.dto';
import { mapTopupStatusResponse } from '../helpers/map-telegram-topup-response';
import { ProcessBankTelegramTopupUseCase } from './process-bank-topup.use-case';
import { ProcessBinanceTelegramTopupUseCase } from './process-binance-topup.use-case';

@Injectable()
export class GetTopupStatusUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    private readonly processBinanceTopup: ProcessBinanceTelegramTopupUseCase,
    private readonly processBankTopup: ProcessBankTelegramTopupUseCase,
  ) {}

  async execute(shopId: string, topupId: number, telegramId: number): Promise<TelegramTopupStatusDto> {
    const userId = await this.topupRepository.findUserIdByTelegramId(telegramId);
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    let topup = await this.topupRepository.findTopupById(shopId, topupId, userId);
    if (!topup) {
      throw new ApiException('topup_not_found', 'Topup not found.', 404);
    }

    if (topup.status === 'PENDING') {
      if (topup.provider === 'BINANCE') {
        await this.processBinanceTopup.execute(topup);
      } else if (topup.provider === 'BANK') {
        await this.processBankTopup.execute(topup);
      }
      topup = (await this.topupRepository.findTopupById(shopId, topupId, userId)) ?? topup;
    }

    return mapTopupStatusResponse(topup);
  }
}
