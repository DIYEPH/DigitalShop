import { ReferralMeSnapshot } from '../../domain/repositories/referral.repository';
import { resolveReferralConfig } from './referral-config';
import { TelegramReferralMeResponseDto } from '../dto/telegram-referral.dto';

export function mapReferralMeResponse(
  snapshot: ReferralMeSnapshot,
  cfg: ReturnType<typeof resolveReferralConfig>,
): TelegramReferralMeResponseDto {
  return {
    referral_code: snapshot.referralCode,
    referred_by_user_id: snapshot.referredByUserId,
    can_bind: snapshot.canBind,
    total_referrals: snapshot.totalReferrals,
    total_earned_points: snapshot.totalEarnedPoints,
    referrer_bonus_points: cfg.referrerBonus,
    referee_bonus_points: cfg.refereeBonus,
    referrals: snapshot.referrals.map((row) => ({
      display_name: row.displayName,
      created_at: row.createdAt.toISOString(),
      referrer_bonus_awarded: row.referrerBonusAwarded,
    })),
  };
}
