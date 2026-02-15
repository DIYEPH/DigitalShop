import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { COUPON_REPOSITORY } from '../../coupon.tokens';
import { CouponRepository } from '../../domain/repositories/coupon.repository';
import { TelegramCouponRedeemDto } from '../dto/telegram-coupon.dto';

@Injectable()
export class RedeemTelegramCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
  ) {}

  async execute(
    input: TelegramCouponRedeemDto,
  ): Promise<{ user_coupon_id: number; code: string }> {
    const userId = await this.couponRepository.findUserIdByTelegramId(Number(input.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const { userCouponId } = await this.couponRepository.redeemShopCoupon(
      userId,
      input.code,
    );

    return {
      user_coupon_id: userCouponId,
      code: input.code.trim().toUpperCase(),
    };
  }
}
