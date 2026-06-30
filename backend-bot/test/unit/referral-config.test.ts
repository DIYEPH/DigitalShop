import assert from 'assert/strict';
import { describe, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { resolveReferralConfig } from '../../src/modules/referral/application/helpers/referral-config';

describe('resolveReferralConfig', () => {
  test('defaults và làm tròn referee 0.5 → 1', () => {
    const config = new ConfigService({
      REFERRAL_REFERRER_BONUS: '1',
      REFERRAL_REFEREE_BONUS: '0.5',
    });
    const resolved = resolveReferralConfig(config);
    assert.equal(resolved.referrerBonus, 1);
    assert.equal(resolved.refereeBonus, 1);
  });
});
