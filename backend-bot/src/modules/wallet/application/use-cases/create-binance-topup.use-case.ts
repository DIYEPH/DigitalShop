import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { ShopPaymentGatewaysService } from '../../../../integration/shop-payment/shop-payment-gateways.service';
import { TOPUP_REPOSITORY } from '../../wallet.tokens';
import { TopupRepository } from '../../domain/repositories/topup.repository';
import {
  TelegramTopupBinanceCreateDto,
  TelegramTopupResponseDto,
} from '../dto/telegram-topup.dto';
import { generateTopupPaymentCode } from '../helpers/payment-code';
import { mapTopupCreateResponse } from '../helpers/map-telegram-topup-response';

const TOPUP_TIMEOUT_MS = 10 * 60 * 1000;
const MIN_AMOUNT = 0.01;

@Injectable()
export class CreateBinanceTelegramTopupUseCase {
  constructor(
    @Inject(TOPUP_REPOSITORY)
    private readonly topupRepository: TopupRepository,
    private readonly shopGateways: ShopPaymentGatewaysService,
  ) {}

  async execute(
    shopId: string,
    input: TelegramTopupBinanceCreateDto,
  ): Promise<TelegramTopupResponseDto> {
    const binanceGateway = await this.shopGateways.getBinance(shopId);
    if (!binanceGateway) {
      throw new ApiException(
        'binance_not_configured',
        'Binance payment is not configured for this shop.',
        503,
      );
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
      throw new ApiException('invalid_amount', `Minimum amount is ${MIN_AMOUNT} USDT.`, 400);
    }

    const userId = await this.topupRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const existing = await this.topupRepository.findActivePendingTopup(shopId, userId);
    if (existing) {
      throw new ApiException(
        'pending_topup_exists',
        'You already have a pending topup. Complete or cancel it first.',
        409,
        {
          topup: mapTopupCreateResponse(existing, { binanceGateway }),
        },
      );
    }

    const topup = await this.topupRepository.createBinanceTopup({
      shopId,
      userId,
      amount,
      paymentCode: generateTopupPaymentCode(),
      expiresAt: new Date(Date.now() + TOPUP_TIMEOUT_MS),
    });

    return mapTopupCreateResponse(topup, { binanceGateway });
  }
}
