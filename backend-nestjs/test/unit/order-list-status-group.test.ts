import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_LIST_STATUS_GROUPS,
  sqlStatusesForOrderListGroup,
} from '../../src/modules/order/domain/order-list-status-group';

test('ORDER_LIST_STATUS_GROUPS', () => {
  assert.deepEqual(ORDER_LIST_STATUS_GROUPS, ['completed', 'pending', 'cancelled']);
});

test('sqlStatusesForOrderListGroup', () => {
  assert.deepEqual(sqlStatusesForOrderListGroup('pending'), ['PENDING']);
  assert.deepEqual(sqlStatusesForOrderListGroup('cancelled'), ['CANCELLED']);
  assert.deepEqual(sqlStatusesForOrderListGroup('completed'), ['DELIVERED', 'PAID']);
});
