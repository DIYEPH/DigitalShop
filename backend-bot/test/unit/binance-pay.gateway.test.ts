import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { BinancePayGateway } from '../../src/integration/binance/binance-pay.gateway';

const gateway = new BinancePayGateway('', '', '', '');

describe('BinancePayGateway.findMatchingPayment', () => {
  const orderCreatedAt = new Date('2026-05-16T12:00:00.000Z');

  test('khớp tx sau thời điểm tạo đơn', () => {
    const matched = gateway.findMatchingPayment(
      [
        {
          transactionId: 'tx-new',
          status: 'SUCCESS',
          note: 'ABCD1234',
          amount: '10',
          currency: 'USDT',
          transactionTime: orderCreatedAt.getTime() + 60_000,
          orderType: 'PAY',
        },
      ],
      'ABCD1234',
      10,
      'USDT',
      orderCreatedAt,
    );
    assert.ok(matched);
    assert.equal(gateway.getExternalTxId(matched), 'tx-new');
  });

  test('bỏ tx trước khi tạo đơn (tránh false PAID/DELIVERED)', () => {
    const matched = gateway.findMatchingPayment(
      [
        {
          transactionId: 'tx-old',
          status: 'SUCCESS',
          note: 'ABCD1234',
          amount: '10',
          currency: 'USDT',
          transactionTime: orderCreatedAt.getTime() - 120_000,
          orderType: 'PAY',
        },
      ],
      'ABCD1234',
      10,
      'USDT',
      orderCreatedAt,
    );
    assert.equal(matched, null);
  });

  test('bỏ chiều chi (amount <= 0)', () => {
    const matched = gateway.findMatchingPayment(
      [
        {
          transactionId: 'tx-out',
          status: 'SUCCESS',
          note: 'ABCD1234',
          amount: '-10',
          currency: 'USDT',
          transactionTime: orderCreatedAt.getTime() + 60_000,
          orderType: 'PAY',
        },
      ],
      'ABCD1234',
      10,
      'USDT',
      orderCreatedAt,
    );
    assert.equal(matched, null);
  });
});
