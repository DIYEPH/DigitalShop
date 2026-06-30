import { ConfigService } from '@nestjs/config';

export function resolveReferralConfig(config: ConfigService): {
  referrerBonus: number;
  refereeBonus: number;
} {
  const referrerRaw = Number(config.get<string>('REFERRAL_REFERRER_BONUS', '1'));
  const refereeRaw = Number(config.get<string>('REFERRAL_REFEREE_BONUS', '0.5'));
  const referrerBonus =
    Number.isFinite(referrerRaw) && referrerRaw > 0 ? Math.max(1, Math.round(referrerRaw)) : 1;
  const refereeBonus =
    Number.isFinite(refereeRaw) && refereeRaw > 0 ? Math.max(1, Math.ceil(refereeRaw)) : 1;
  return { referrerBonus, refereeBonus };
}
