export interface DailyLoginClaimResult {
  pointsAwarded: number;
  balancePoint: number;
}

export interface DailyLoginStatusSnapshot {
  claimedToday: boolean;
  nextClaimAt: string | null;
}

export interface PointRepository {
  findUserIdByTelegramId(telegramId: number): Promise<number | null>;
  getDailyLoginStatusByTelegramId(
    shopId: string,
    telegramId: number,
    claimDate: string,
    timezone: string,
  ): Promise<DailyLoginStatusSnapshot | null>;
  claimDailyLogin(
    shopId: string,
    userId: number,
    claimDate: string,
    pointsAwarded: number,
  ): Promise<DailyLoginClaimResult | null>;
}
