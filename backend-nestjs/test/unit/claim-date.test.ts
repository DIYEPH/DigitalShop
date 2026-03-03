import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { claimDateInTimezone } from '../../src/modules/point/domain/claim-date';

describe('claimDateInTimezone', () => {
  test('định dạng YYYY-MM-DD theo Asia/Ho_Chi_Minh', () => {
    const date = claimDateInTimezone('Asia/Ho_Chi_Minh', new Date('2026-05-16T20:00:00.000Z'));
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  });
});
