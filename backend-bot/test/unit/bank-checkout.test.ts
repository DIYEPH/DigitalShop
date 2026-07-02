import assert from 'assert/strict';
import { describe, test } from 'node:test';
import {
  assertBankCheckoutConfigured,
  filterPaymentMethodsForShop,
  isBankCheckoutReady,
} from '../../src/integration/bank/bank-checkout';
import { SepayGateway } from '../../src/integration/bank/sepay.gateway';
import { BinancePayGateway } from '../../src/integration/binance/binance-pay.gateway';
import { ApiException } from '../../src/shared/errors/api.exception';

const readyGateway = new SepayGateway(
  'sep-key',
  'Vietcombank',
  '0123456789',
  'NGUYEN VAN A',
  '970436',
);

const emptyGateway = new SepayGateway('', '', '', '', '');

const readyBinance = new BinancePayGateway('api-key', 'api-secret', '123456789', '');

describe('bank-checkout', () => {
  test('isBankCheckoutReady — đủ SEPAY + BANK_*, null → false', () => {
    assert.equal(isBankCheckoutReady(readyGateway), true);
    assert.equal(isBankCheckoutReady(emptyGateway), false);
    assert.equal(isBankCheckoutReady(null), false);
  });

  test('assertBankCheckoutConfigured — thiếu config → bank_not_configured', () => {
    for (const gateway of [emptyGateway, null]) {
      assert.throws(
        () => assertBankCheckoutConfigured(gateway),
        (err: unknown) => {
          assert.ok(err instanceof ApiException);
          const body = err.getResponse() as { error?: { code?: string } };
          assert.equal(body.error?.code, 'bank_not_configured');
          assert.equal(err.getStatus(), 400);
          return true;
        },
      );
    }
  });

  test('filterPaymentMethodsForShop — ẩn BANK/BINANCE khi shop chưa cấu hình', () => {
    const methods = ['BINANCE', 'BANK', 'BALANCE'];
    assert.deepEqual(
      filterPaymentMethodsForShop(methods, { sepay: readyGateway, binance: readyBinance }),
      methods,
    );
    assert.deepEqual(
      filterPaymentMethodsForShop(methods, { sepay: emptyGateway, binance: readyBinance }),
      ['BINANCE', 'BALANCE'],
    );
    assert.deepEqual(
      filterPaymentMethodsForShop(methods, { sepay: null, binance: null }),
      ['BALANCE'],
    );
  });
});
