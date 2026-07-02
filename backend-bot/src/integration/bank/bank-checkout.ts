import { ApiException } from '../../shared/errors/api.exception';
import { BinancePayGateway } from '../binance/binance-pay.gateway';
import { SepayGateway } from './sepay.gateway';

export function isBankCheckoutReady(gateway: SepayGateway | null): boolean {
  return Boolean(gateway?.isBankCheckoutReady());
}

export function assertBankCheckoutConfigured(
  gateway: SepayGateway | null,
): asserts gateway is SepayGateway {
  if (gateway?.isBankCheckoutReady()) return;
  throw new ApiException(
    'bank_not_configured',
    'Bank transfer (VND) is not configured for this shop.',
    400,
  );
}

/** Hides payment methods the shop has not configured (BANK via SePay, BINANCE via Binance Pay). */
export function filterPaymentMethodsForShop(
  methods: string[],
  gateways: { sepay: SepayGateway | null; binance: BinancePayGateway | null },
): string[] {
  const list = Array.isArray(methods) ? methods : [];
  return list.filter((method) => {
    if (method === 'BANK') return Boolean(gateways.sepay?.isBankCheckoutReady());
    if (method === 'BINANCE') return Boolean(gateways.binance?.isEnabled());
    return true;
  });
}
