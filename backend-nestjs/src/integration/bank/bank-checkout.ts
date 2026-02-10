import { ApiException } from '../../shared/errors/api.exception';
import { SepayGateway } from './sepay.gateway';

export function isBankCheckoutReady(gateway: SepayGateway): boolean {
  return gateway.isBankCheckoutReady();
}

export function assertBankCheckoutConfigured(gateway: SepayGateway): void {
  if (gateway.isBankCheckoutReady()) return;
  throw new ApiException(
    'bank_not_configured',
    'Bank transfer (VND) is not configured. Set SEPAY_API_KEY and BANK_* env.',
    400,
  );
}

export function filterPaymentMethodsForBank(
  methods: string[],
  gateway: SepayGateway,
): string[] {
  const list = Array.isArray(methods) ? methods : [];
  if (gateway.isBankCheckoutReady()) return list;
  return list.filter((method) => method !== 'BANK');
}
