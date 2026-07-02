export interface ReferralMeSnapshot {
  referralCode: string;
  referredByUserId: number | null;
  canBind: boolean;
  totalReferrals: number;
  totalEarnedPoints: number;
  referrals: ReferralListItem[];
}

export interface ReferralListItem {
  referredUserId: number;
  displayName: string;
  createdAt: Date;
  referrerBonusAwarded: boolean;
}

export interface BindReferralResult {
  refereeBonusPoints: number;
  balancePoint: number;
  referrerDisplayName: string;
}

export interface ReferralRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  getReferralMeByTelegramId(
    shopId: string,
    telegramId: number,
  ): Promise<ReferralMeSnapshot | null>;
  bindReferralByCode(
    shopId: string,
    referredUserId: number,
    code: string,
    refereeBonusPoints: number,
    referrerBonusPoints: number,
  ): Promise<BindReferralResult | null>;
}
