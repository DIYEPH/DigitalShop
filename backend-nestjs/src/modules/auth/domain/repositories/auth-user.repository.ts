import { AuthUserEntity } from '../entities/auth-user.entity';

export interface AuthUserRepository {
  findTelegramMeById(telegramId: number): Promise<{
    id: number;
    telegramId: number;
    username: string | null;
    fullName: string | null;
    balanceVnd: number;
    balanceUsdt: number;
    balancePoint: number;
    completedOrders: number;
    balanceSpentUsdt: number;
    creditsSpentCoin: number;
  } | null>;
  getOrCreateByTelegramIdentity(input: {
    telegramId: number;
    username?: string;
    fullName?: string;
  }): Promise<AuthUserEntity>;
  updateLanguageByTelegramId(
    telegramId: number,
    language: 'en' | 'vi' | 'ru' | 'zh',
  ): Promise<AuthUserEntity | null>;
}
