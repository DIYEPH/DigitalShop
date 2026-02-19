import { IsInt, Min } from 'class-validator';

export class TelegramDailyLoginClaimDto {
  @IsInt()
  @Min(1)
  telegram_id!: number;
}

export interface TelegramDailyLoginStatusDto {
  can_claim: boolean;
  points_reward: number;
  claimed_today: boolean;
  /** ISO UTC — 00:00 ngày kế tiếp theo `claim_timezone`. */
  next_claim_at: string | null;
  /** IANA timezone dùng cho `claim_date` — bot chỉ dùng field này khi format giờ, không đọc env. */
  claim_timezone: string;
}

export interface TelegramDailyLoginClaimResponseDto {
  points_awarded: number;
  balance_point: number;
  claimed_today: boolean;
}
