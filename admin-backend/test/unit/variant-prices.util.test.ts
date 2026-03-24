import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  resolvePricesForCreate,
  resolvePricesForUpdate,
} from '../../src/modules/products/utils/variant-prices.util';

describe('variant-prices.util', () => {
  test('create — chỉ USDT, VND = 0 (không quy đổi)', () => {
    const { amountUsdt, amountVnd } = resolvePricesForCreate([
      { currency: 'USDT', amount: 9.99 },
    ]);
    assert.equal(amountUsdt, 9.99);
    assert.equal(amountVnd, 0);
  });

  test('create — USDT và VND riêng', () => {
    const { amountUsdt, amountVnd } = resolvePricesForCreate([
      { currency: 'USDT', amount: 4.99 },
      { currency: 'VND', amount: 129000 },
    ]);
    assert.equal(amountUsdt, 4.99);
    assert.equal(amountVnd, 129000);
  });

  test('update — chỉ patch USDT', () => {
    const patch = resolvePricesForUpdate([{ currency: 'USDT', amount: 5 }]);
    assert.equal(patch.amountUsdt, 5);
    assert.equal(patch.amountVnd, undefined);
  });
});
