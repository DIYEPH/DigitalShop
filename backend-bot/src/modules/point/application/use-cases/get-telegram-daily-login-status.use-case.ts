import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../../shared/errors/api.exception';
import { PointRepository } from '../../domain/repositories/point.repository';
import { POINT_REPOSITORY } from '../../point.tokens';
import { resolveDailyLoginContext } from '../helpers/daily-login-config';
import { TelegramDailyLoginStatusDto } from '../dto/telegram-daily-login.dto';

@Injectable()
export class GetTelegramDailyLoginStatusUseCase {
  constructor(
    @Inject(POINT_REPOSITORY)
    private readonly pointRepository: PointRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(shopId: string, telegramId: number): Promise<TelegramDailyLoginStatusDto> {
    const { timezone, claimDate, pointsReward } = resolveDailyLoginContext(this.config);
    const status = await this.pointRepository.getDailyLoginStatusByTelegramId(
      shopId,
      telegramId,
      claimDate,
      timezone,
    );
    if (!status) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    return {
      can_claim: !status.claimedToday,
      points_reward: pointsReward,
      claimed_today: status.claimedToday,
      next_claim_at: status.nextClaimAt,
      claim_timezone: timezone,
    };
  }
}
