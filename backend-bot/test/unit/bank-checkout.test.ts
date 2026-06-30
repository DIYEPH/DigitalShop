import assert from 'assert/strict';
import { describe, test } from 'node:test';
import {
  assertBankCheckoutConfigured,
  filterPaymentMethodsForBank,
  isBankCheckoutReady,
} from '../../src/integration/bank/bank-checkout';
import { SepayGateway } from '../../src/integration/bank/sepay.gateway';
import { ApiException } from '../../src/shared/errors/api.exception';

const readyGateway = new SepayGateway(
  'sep-key',
  'Vietcombank',
  '0123456789',
  'NGUYEN VAN A',
  '970436',
);

const emptyGateway = new SepayGateway('', '', '', '', '');

describe('bank-checkout', () => {
  test('isBankCheckoutReady — đủ SEPAY + BANK_*', () => {
    assert.equal(isBankCheckoutReady(readyGateway), true);
    assert.equal(isBankCheckoutReady(emptyGateway), false);
  });

  test('assertBankCheckoutConfigured — thiếu config → bank_not_configured', () => {
    assert.throws(
      () => assertBankCheckoutConfigured(emptyGateway),
      (err: unknown) => {
        assert.ok(err instanceof ApiException);
        const body = err.getResponse() as { error?: { code?: string } };
        assert.equal(body.error?.code, 'bank_not_configured');
        assert.equal(err.getStatus(), 400);
        return true;
      },
    );
  });

  test('filterPaymentMethodsForBank — ẩn BANK khi chưa cấu hình', () => {
    const methods = ['BINANCE', 'BANK', 'BALANCE'];
    assert.deepEqual(filterPaymentMethodsForBank(methods, readyGateway), methods);
    assert.deepEqual(filterPaymentMethodsForBank(methods, emptyGateway), [
      'BINANCE',
      'BALANCE',
    ]);
  });
});
