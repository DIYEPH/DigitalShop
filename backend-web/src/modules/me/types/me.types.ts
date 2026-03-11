import { AuthUser } from '../../auth/types/auth-user';

export type ProfileResponse = {
  user: AuthUser;
};

export type DailyLoginPointStatus = {
  claimedToday: boolean;
  reward: number;
  points: number;
};

export type DailyLoginPointClaimResult = {
  claimed: boolean;
  claimedToday: boolean;
  reward: number;
  points: number;
};

export type DailyLoginPointMonthHistoryItem = {
  id: number;
  claimDate: string;
  pointsAwarded: number;
  createdAt: string;
};
