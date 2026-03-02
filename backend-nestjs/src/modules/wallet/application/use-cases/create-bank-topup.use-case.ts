import { Inject, Injectable } from '@nestjs/common';
import { assertBankCheckoutConfigured } from '../../../../integration/bank/bank-checkout';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { ApiException } from '../../../../shared/errors/api.exception';
import { SEPAY_GATEWAY } from '../../../../integration/bank/bank.tokens';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupRepository } from '../../domain/repositories/topup.repository';
import {
  TelegramTopupBankCreateDto,
  TelegramTopupResponseDto,
} from '../dto/telegram-topup.dto';
import { MIN_BANK_TOPUP_VND } from '../../../../shared/constants/wallet-topup';
import { generateTopupPaymentCode } from '../helpers/payment-code';
import { mapTopupCreateResponse } from '../helpers/map-telegram-topup-response';

const TOPUP_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class CreateBankTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    @Inject(SEPAY_GATEWAY)
    private readonly sepayGateway: SepayGateway,
  ) {}

  async execute(input: TelegramTopupBankCreateDto): Promise<TelegramTopupResponseDto> {
    assertBankCheckoutConfigured(this.sepayGateway);

    const amount = Math.round(Number(input.amount));
    if (!Number.isInteger(amount) || amount < MIN_BANK_TOPUP_VND) {
      throw new ApiException(
        'invalid_amount',
        `Minimum amount is ${MIN_BANK_TOPUP_VND} VND.`,
        400,
      );
    }

    const userId = await this.topupRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const existing = await this.topupRepository.findActivePendingTopup(userId);
    if (existing) {
      throw new ApiException(
        'pending_topup_exists',
        'You already have a pending topup. Complete or cancel it first.',
        409,
        {
          topup: mapTopupCreateResponse(existing, { sepayGateway: this.sepayGateway }),
        },
      );
    }

    const topup = await this.topupRepository.createBankTopup({
      userId,
      amount,
      paymentCode: generateTopupPaymentCode(),
      expiresAt: new Date(Date.now() + TOPUP_TIMEOUT_MS),
    });

    return mapTopupCreateResponse(topup, { sepayGateway: this.sepayGateway });
  }
}
