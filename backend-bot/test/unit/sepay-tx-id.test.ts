import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildSepayTopupTxId } from '../../src/integration/bank/sepay-tx-id';

describe('buildSepayTopupTxId', () => {
  test('ưu tiên id từ SePay', () => {
    assert.equal(buildSepayTopupTxId({ id: 42, amount_in: 200_000 }), 'sepay:42');
  });

  test('fallback khi không có id', () => {
    const key = buildSepayTopupTxId({
      transaction_content: 'ABC123',
      amount_in: 200_000,
      transaction_date: '2026-05-16T10:00:00',
    });
    assert.ok(key.startsWith('sepay:2026-05-16'));
    assert.ok(key.includes('ABC123'));
  });
});
