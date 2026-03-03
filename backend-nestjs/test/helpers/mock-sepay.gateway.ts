import {
  SepayGateway,
  SepayTransaction,
} from '../../src/integration/bank/sepay.gateway';

const E2E_BANK = {
  apiKey: 'e2e-sepay-key',
  bankName: 'Vietcombank',
  bankAccount: '0123456789',
  bankOwner: 'E2E SHOP',
  bankBin: '970436',
};

/** SePay gateway cho e2e — `getTransactions` đọc từ supplier (có thể đổi sau khi tạo topup). */
export function createMockSepayGateway(
  getTransactions: () => SepayTransaction[],
): SepayGateway {
  const delegate = new SepayGateway(
    E2E_BANK.apiKey,
    E2E_BANK.bankName,
    E2E_BANK.bankAccount,
    E2E_BANK.bankOwner,
    E2E_BANK.bankBin,
  );

  return {
    isEnabled: () => true,
    isBankTransferConfigured: () => true,
    isBankCheckoutReady: () => true,
    getBankName: () => delegate.getBankName(),
    getBankAccount: () => delegate.getBankAccount(),
    getBankOwner: () => delegate.getBankOwner(),
    getBankBin: () => delegate.getBankBin(),
    buildVietQrUrl: (amountVnd, paymentCode) => delegate.buildVietQrUrl(amountVnd, paymentCode),
    getTransactions: async () => getTransactions(),
    findMatchingPayment: (transactions, paymentCode, amountVnd, orderCreatedAt) =>
      delegate.findMatchingPayment(transactions, paymentCode, amountVnd, orderCreatedAt),
  } as SepayGateway;
}
