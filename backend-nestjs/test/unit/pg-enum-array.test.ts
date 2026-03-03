import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { parsePgEnumArray } from '../../src/shared/infrastructure/pg-enum-array';

describe('parsePgEnumArray', () => {
  test('parse mảng JS', () => {
    assert.deepEqual(parsePgEnumArray(['BINANCE', 'BANK']), ['BINANCE', 'BANK']);
  });

  test('parse chuỗi Postgres enum array', () => {
    assert.deepEqual(parsePgEnumArray('{BINANCE,BALANCE,CRYPTO,BANK}'), [
      'BINANCE',
      'BALANCE',
      'CRYPTO',
      'BANK',
    ]);
  });

  test('empty / null', () => {
    assert.deepEqual(parsePgEnumArray('{}'), []);
    assert.deepEqual(parsePgEnumArray(null), []);
  });
});
