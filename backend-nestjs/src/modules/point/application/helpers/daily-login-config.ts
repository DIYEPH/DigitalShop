import { ConfigService } from '@nestjs/config';
import { claimDateInTimezone } from '../../domain/claim-date';

export function resolveDailyLoginContext(config: ConfigService): {
  timezone: string;
  claimDate: string;
  pointsReward: number;
} {
  const tzRaw = config.get<string>('DAILY_LOGIN_TIMEZONE', 'Asia/Ho_Chi_Minh');
  const timezone = tzRaw?.trim() || 'Asia/Ho_Chi_Minh';
  const ptsRaw = Number(config.get<string>('DAILY_LOGIN_POINTS_REWARD', '5'));
  const pointsReward = Number.isInteger(ptsRaw) && ptsRaw > 0 ? ptsRaw : 5;
  return { timezone, claimDate: claimDateInTimezone(timezone), pointsReward };
}
