import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { resolveDailyLoginContext } from '../../src/modules/point/application/helpers/daily-login-config';

function mockConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string, defaultValue?: string) => values[key] ?? defaultValue,
  } as ConfigService;
}

describe('resolveDailyLoginContext', () => {
  test('mặc định timezone + 5 point + claimDate YYYY-MM-DD', () => {
    const ctx = resolveDailyLoginContext(mockConfig({}));
    assert.equal(ctx.timezone, 'Asia/Ho_Chi_Minh');
    assert.equal(ctx.pointsReward, 5);
    assert.match(ctx.claimDate, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('env override', () => {
    const ctx = resolveDailyLoginContext(
      mockConfig({ DAILY_LOGIN_POINTS_REWARD: '10', DAILY_LOGIN_TIMEZONE: 'UTC' }),
    );
    assert.equal(ctx.timezone, 'UTC');
    assert.equal(ctx.pointsReward, 10);
  });
});
