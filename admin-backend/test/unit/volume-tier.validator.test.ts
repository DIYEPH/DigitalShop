import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validateVolumeTiers } from '../../src/modules/products/utils/volume-tier.validator';

describe('validateVolumeTiers', () => {
  test('accepts valid ascending discounts', () => {
    const result = validateVolumeTiers([
      { min_quantity: 2, discount_bps: 100, is_active: true },
      { min_quantity: 5, discount_bps: 200, is_active: true },
    ]);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, []);
  });

  test('rejects duplicate min_quantity', () => {
    const result = validateVolumeTiers([
      { min_quantity: 2, discount_bps: 100, is_active: true },
      { min_quantity: 2, discount_bps: 150, is_active: true },
    ]);
    assert.equal(result.isValid, false);
    assert.match(result.errors[0], /Duplicate quantities/);
  });

  test('rejects decreasing discount_bps', () => {
    const result = validateVolumeTiers([
      { min_quantity: 2, discount_bps: 300, is_active: true },
      { min_quantity: 5, discount_bps: 100, is_active: true },
    ]);
    assert.equal(result.isValid, false);
    assert.match(result.errors[0], /Discount must increase/);
  });
});
