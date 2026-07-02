import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../../shared/errors/api.exception';
import { ReferralRepository } from '../../domain/repositories/referral.repository';
import { REFERRAL_REPOSITORY } from '../../referral.tokens';
import { resolveReferralConfig } from '../helpers/referral-config';
import {
  TelegramReferralBindResponseDto,
  TelegramReferralBindDto,
} from '../dto/telegram-referral.dto';

@Injectable()
export class BindTelegramReferralUseCase {
  constructor(
    @Inject(REFERRAL_REPOSITORY)
    private readonly referralRepository: ReferralRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    shopId: string,
    input: TelegramReferralBindDto,
  ): Promise<TelegramReferralBindResponseDto> {
    const telegramId = Number(input.telegram_id);
    const code = String(input.code || '').trim();
    if (!code) {
      throw new ApiException('referral_invalid', 'Invalid referral code.', 400);
    }

    const userId = await this.referralRepository.findUserIdByTelegramId(telegramId);
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const cfg = resolveReferralConfig(this.config);
    const result = await this.referralRepository.bindReferralByCode(
      shopId,
      userId,
      code,
      cfg.refereeBonus,
      cfg.referrerBonus,
    );
    if (!result) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    return {
      referee_bonus_points: result.refereeBonusPoints,
      balance_point: result.balancePoint,
      referrer_display_name: result.referrerDisplayName,
    };
  }
}
