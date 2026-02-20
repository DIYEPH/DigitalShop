import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../../shared/errors/api.exception';
import { PointRepository } from '../../domain/repositories/point.repository';
import { POINT_REPOSITORY } from '../../point.tokens';
import { resolveDailyLoginContext } from '../helpers/daily-login-config';
import { TelegramDailyLoginClaimResponseDto } from '../dto/telegram-daily-login.dto';

@Injectable()
export class ClaimTelegramDailyLoginUseCase {
  constructor(
    @Inject(POINT_REPOSITORY)
    private readonly pointRepository: PointRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(telegramId: number): Promise<TelegramDailyLoginClaimResponseDto> {
    const userId = await this.pointRepository.findUserIdByTelegramId(telegramId);
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const { claimDate, pointsReward } = resolveDailyLoginContext(this.config);
    const claimed = await this.pointRepository.claimDailyLogin(userId, claimDate, pointsReward);
    if (!claimed) {
      throw new ApiException(
        'daily_already_claimed',
        'Daily login reward was already claimed today.',
        400,
      );
    }

    return {
      points_awarded: claimed.pointsAwarded,
      balance_point: claimed.balancePoint,
      claimed_today: true,
    };
  }
}
