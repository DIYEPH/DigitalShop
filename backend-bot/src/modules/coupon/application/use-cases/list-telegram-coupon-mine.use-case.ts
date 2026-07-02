import { Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../../../shared/errors/api.exception';
import { COUPON_REPOSITORY } from '../../coupon.tokens';
import { CouponRepository } from '../../domain/repositories/coupon.repository';
import { TelegramCouponMineQueryDto } from '../dto/telegram-coupon.dto';
import { CouponWalletItemDto, mapCouponWalletItems } from '../helpers/map-coupon-wallet-item';

@Injectable()
export class ListTelegramCouponMineUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: CouponRepository,
  ) {}

  async execute(
    shopId: string,
    query: TelegramCouponMineQueryDto,
  ): Promise<{ status: 'active' | 'used'; items: CouponWalletItemDto[] }> {
    const userId = await this.couponRepository.findUserIdByTelegramId(Number(query.telegram_id));
    if (!userId) {
      throw new ApiException('user_not_found', 'Telegram user is not linked yet.', 404);
    }

    const status = query.status === 'used' ? 'used' : 'active';
    const rows = await this.couponRepository.listUserCoupons({
      shopId,
      userId,
      status,
      variantId: query.variant_id,
    });

    const items = await mapCouponWalletItems(this.couponRepository, rows, userId, {
      variantId: query.variant_id,
    });

    return { status, items };
  }
}
