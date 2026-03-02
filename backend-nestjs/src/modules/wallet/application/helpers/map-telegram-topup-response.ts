import { BinancePayGateway } from '../../../../integration/binance/binance-pay.gateway';
import { SepayGateway } from '../../../../integration/bank/sepay.gateway';
import { TopupEntity } from '../../domain/entities/topup.entity';
import { TelegramTopupResponseDto, TelegramTopupStatusDto } from '../dto/telegram-topup.dto';

export function mapTopupCreateResponse(
  topup: TopupEntity,
  gateways: { binanceGateway?: BinancePayGateway; sepayGateway?: SepayGateway },
): TelegramTopupResponseDto {
  const now = Date.now();
  const expiresMs = topup.expiresAt.getTime();
  const secondsLeft =
    topup.status === 'PENDING' ? Math.max(0, Math.floor((expiresMs - now) / 1000)) : null;

  const isBank = topup.provider === 'BANK';
  const sepay = gateways.sepayGateway;

  return {
    topup_id: topup.id,
    provider: topup.provider,
    payment_code: topup.paymentCode,
    amount: topup.amount,
    currency: topup.currency,
    status: topup.status,
    binance_id: topup.provider === 'BINANCE' ? gateways.binanceGateway?.getPayId() || null : null,
    binance_qr_url: topup.provider === 'BINANCE' ? gateways.binanceGateway?.getPayQrUrl() ?? null : null,
    bank_name: isBank ? sepay?.getBankName() ?? null : null,
    bank_account: isBank ? sepay?.getBankAccount() ?? null : null,
    bank_owner: isBank ? sepay?.getBankOwner() ?? null : null,
    vietqr_url:
      isBank && sepay
        ? sepay.buildVietQrUrl(Math.round(topup.amount), topup.paymentCode)
        : null,
    expires_at: topup.status === 'PENDING' ? topup.expiresAt.toISOString() : null,
    seconds_left: secondsLeft,
  };
}

export function mapTopupStatusResponse(topup: TopupEntity): TelegramTopupStatusDto {
  const now = Date.now();
  const expiresMs = topup.expiresAt.getTime();
  const secondsLeft =
    topup.status === 'PENDING' ? Math.max(0, Math.floor((expiresMs - now) / 1000)) : null;

  return {
    topup_id: topup.id,
    provider: topup.provider,
    payment_code: topup.paymentCode,
    amount: topup.amount,
    currency: topup.currency,
    status: topup.status,
    paid_at: topup.paidAt?.toISOString() ?? null,
    expires_at: topup.status === 'PENDING' ? topup.expiresAt.toISOString() : null,
    seconds_left: secondsLeft,
  };
}
