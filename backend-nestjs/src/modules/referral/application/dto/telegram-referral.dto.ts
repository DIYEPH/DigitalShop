import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class TelegramReferralBindDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export interface TelegramReferralMeResponseDto {
  referral_code: string;
  referred_by_user_id: number | null;
  can_bind: boolean;
  total_referrals: number;
  total_earned_points: number;
  referrer_bonus_points: number;
  referee_bonus_points: number;
  referrals: TelegramReferralListItemDto[];
}

export interface TelegramReferralListItemDto {
  display_name: string;
  created_at: string;
  referrer_bonus_awarded: boolean;
}

export interface TelegramReferralBindResponseDto {
  referee_bonus_points: number;
  balance_point: number;
  referrer_display_name: string;
}
