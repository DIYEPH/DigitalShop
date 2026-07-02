import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../../../shared/errors/api.exception';
import { ReferralRepository } from '../../domain/repositories/referral.repository';
import { REFERRAL_REPOSITORY } from '../../referral.tokens';
import { mapReferralMeResponse } from '../helpers/map-referral-me-response';
import { resolveReferralConfig } from '../helpers/referral-config';
import { TelegramReferralMeResponseDto } from '../dto/telegram-referral.dto';

@Injectable()
export class GetTelegramReferralMeUseCase {
  constructor(
    @Inject(REFERRAL_REPOSITORY)
    private readonly referralRepository: ReferralRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(shopId: string, telegramId: number): Promise<TelegramReferralMeResponseDto> {
    const snapshot = await this.referralRepository.getReferralMeByTelegramId(shopId, telegramId);
    if (!snapshot) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }
    return mapReferralMeResponse(snapshot, resolveReferralConfig(this.config));
  }
}
