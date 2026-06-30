import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupRepository } from '../../domain/repositories/topup.repository';

@Injectable()
export class CancelTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
  ) {}

  async execute(topupId: number, telegramId: number): Promise<void> {
    const userId = await this.topupRepository.findUserIdByTelegramId(telegramId);
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const cancelled = await this.topupRepository.cancelTopup(topupId, userId);
    if (!cancelled) {
      throw new ApiException('topup_not_cancellable', 'Topup not found or already completed.', 404);
    }
  }
}
