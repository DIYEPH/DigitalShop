import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { usesPaymentCode, usesTxId } from '../../src/modules/order/domain/order-payment-fields';

describe('order-payment-fields', () => {
  test('usesPaymentCode — BINANCE và BANK', () => {
    assert.equal(usesPaymentCode('BINANCE'), true);
    assert.equal(usesPaymentCode('BANK'), true);
    assert.equal(usesPaymentCode('CRYPTO'), false);
    assert.equal(usesPaymentCode('BALANCE'), false);
  });

  test('usesTxId — chỉ CRYPTO', () => {
    assert.equal(usesTxId('CRYPTO'), true);
    assert.equal(usesTxId('BINANCE'), false);
    assert.equal(usesTxId('BANK'), false);
  });
});
