import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { SepayGateway } from '../../src/integration/bank/sepay.gateway';

const gateway = new SepayGateway(
  'test-key',
  'Vietcombank',
  '0123456789',
  'NGUYEN VAN A',
  '970436',
);

describe('SepayGateway', () => {
  const orderCreatedAt = new Date('2026-05-16T12:00:00.000Z');

  test('isBankCheckoutReady', () => {
    assert.equal(gateway.isBankCheckoutReady(), true);
    assert.equal(new SepayGateway('key', '', '', '', '').isBankCheckoutReady(), false);
  });

  test('buildVietQrUrl — có amount và payment_code', () => {
    const url = gateway.buildVietQrUrl(129000, 'ABCD1234');
    assert.ok(url?.includes('vietqr.io'));
    assert.ok(url?.includes('amount=129000'));
    assert.ok(url?.includes('addInfo=ABCD1234'));
  });

  test('findMatchingPayment — khớp nội dung + số tiền VND', () => {
    const matched = gateway.findMatchingPayment(
      [
        {
          transaction_content: 'CK ABCD1234 nap',
          amount_in: 129000,
          transaction_date: '2026-05-16T12:05:00.000Z',
        },
      ],
      'ABCD1234',
      129000,
      orderCreatedAt,
    );
    assert.ok(matched);
  });

  test('findMatchingPayment — thiếu tiền → null', () => {
    const matched = gateway.findMatchingPayment(
      [{ transaction_content: 'ABCD1234', amount_in: 100000 }],
      'ABCD1234',
      129000,
      orderCreatedAt,
    );
    assert.equal(matched, null);
  });

  test('findMatchingPayment — giao dịch trước tạo đơn → null', () => {
    const matched = gateway.findMatchingPayment(
      [
        {
          transaction_content: 'ABCD1234',
          amount_in: 129000,
          transaction_date: '2026-05-16T11:00:00.000Z',
        },
      ],
      'ABCD1234',
      129000,
      orderCreatedAt,
    );
    assert.equal(matched, null);
  });
});
