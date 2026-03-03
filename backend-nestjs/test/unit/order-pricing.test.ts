import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { ApiException } from '../../src/shared/errors/api.exception';
import {
  applyFixedCouponDiscount,
  applyVolumeDiscount,
  buildOrderExpiry,
  currencyForPaymentMethod,
  pickBestVolumeTier,
  resolveCouponDiscounts,
  roundUsdt,
  roundVnd,
  totalPriceForPaymentMethod,
} from '../../src/modules/order/domain/order-pricing';

describe('order-pricing', () => {
  test('pickBestVolumeTier chọn min_quantity lớn nhất thỏa qty', () => {
    const tiers = [
      { minQuantity: 2, discountBps: 500, isActive: true },
      { minQuantity: 5, discountBps: 1000, isActive: true },
    ];
    assert.deepEqual(pickBestVolumeTier(tiers, 4), { minQuantity: 2, discountBps: 500 });
    assert.deepEqual(pickBestVolumeTier(tiers, 5), { minQuantity: 5, discountBps: 1000 });
    assert.equal(pickBestVolumeTier(tiers, 1), null);
  });

  test('applyVolumeDiscount giảm theo bps', () => {
    const tier = { minQuantity: 2, discountBps: 1000 };
    assert.equal(applyVolumeDiscount(10, tier), 9);
    assert.equal(applyVolumeDiscount(10, null), 10);
  });

  test('roundUsdt / roundVnd', () => {
    assert.equal(roundUsdt(4.995), 5);
    assert.equal(roundVnd(129000.4), 129000);
  });

  test('resolveCouponDiscounts PERCENT 10%', () => {
    const coupon = {
      id: 1,
      code: 'WELCOME10',
      variantId: 1,
      isActive: true,
      startsAt: null,
      endsAt: null,
      visibility: 'PUBLIC',
      requiresOwnership: false,
      discountType: 'PERCENT',
      percentBps: 1000,
      amountUsdt: null,
      amountVnd: null,
      maxRedemptions: null,
      perUserLimit: null,
    };
    const result = resolveCouponDiscounts(coupon, 1, 9.98, 258000, new Date());
    assert.equal(result.couponCode, 'WELCOME10');
    assert.equal(result.discountUsdt, 0.998);
    assert.equal(result.discountVnd, 25800);
  });

  test('currencyForPaymentMethod và totalPriceForPaymentMethod', () => {
    const pricing = {
      unitUsdt: 4.99,
      unitVnd: 129000,
      subtotalUsdt: 4.99,
      subtotalVnd: 129000,
      discountUsdt: 0,
      discountVnd: 0,
      totalUsdt: 4.99,
      totalVnd: 129000,
      volumeTierApplied: null,
      couponApplied: null,
    };
    assert.equal(currencyForPaymentMethod('BINANCE'), 'USDT');
    assert.equal(currencyForPaymentMethod('BANK'), 'VND');
    assert.equal(currencyForPaymentMethod('BALANCE_VND'), 'VND');
    assert.equal(totalPriceForPaymentMethod(pricing, 'BALANCE'), 4.99);
    assert.equal(totalPriceForPaymentMethod(pricing, 'BANK'), 129000);
  });

  test('buildOrderExpiry — BINANCE/CRYPTO/BANK có timeout 10 phút', () => {
    const createdAt = new Date();
    for (const method of ['BINANCE', 'CRYPTO', 'BANK']) {
      const timed = buildOrderExpiry(createdAt, method);
      assert.ok(timed.expiresAt, method);
      assert.ok((timed.secondsLeft ?? 0) > 0, method);
    }

    const balance = buildOrderExpiry(createdAt, 'BALANCE');
    assert.equal(balance.expiresAt, null);
    assert.equal(balance.secondsLeft, null);
  });

  test('applyFixedCouponDiscount USDT + VND', () => {
    const coupon = {
      id: 2,
      code: 'FIXED',
      variantId: 1,
      isActive: true,
      startsAt: null,
      endsAt: null,
      visibility: 'PUBLIC',
      requiresOwnership: false,
      discountType: 'FIXED',
      percentBps: null,
      amountUsdt: 1,
      amountVnd: 10000,
      maxRedemptions: null,
      perUserLimit: null,
    };
    const result = applyFixedCouponDiscount(coupon, 5, 50000);
    assert.equal(result.discountUsdt, 1);
    assert.equal(result.discountVnd, 10000);
  });

  test('resolveCouponDiscounts PRIVATE promo (không ownership)', () => {
    const coupon = {
      id: 3,
      code: 'PROMO',
      variantId: 1,
      isActive: true,
      startsAt: null,
      endsAt: null,
      visibility: 'PRIVATE',
      requiresOwnership: false,
      discountType: 'PERCENT',
      percentBps: 1500,
      amountUsdt: null,
      amountVnd: null,
      maxRedemptions: null,
      perUserLimit: null,
    };
    const result = resolveCouponDiscounts(coupon, 1, 10, 100000, new Date());
    assert.equal(result.couponCode, 'PROMO');
    assert.equal(result.discountUsdt, 1.5);
    assert.equal(result.discountVnd, 15000);
  });

  test('resolveCouponDiscounts sai variant → coupon_invalid', () => {
    const coupon = {
      id: 1,
      code: 'X',
      variantId: 99,
      isActive: true,
      startsAt: null,
      endsAt: null,
      visibility: 'PUBLIC',
      requiresOwnership: false,
      discountType: 'PERCENT',
      percentBps: 1000,
      amountUsdt: null,
      amountVnd: null,
      maxRedemptions: null,
      perUserLimit: null,
    };
    assert.throws(
      () => resolveCouponDiscounts(coupon, 1, 10, 100, new Date()),
      (err: unknown) => {
        if (!(err instanceof ApiException)) return false;
        const body = err.getResponse() as { error?: { code?: string } };
        return body?.error?.code === 'coupon_invalid';
      },
    );
  });
});
