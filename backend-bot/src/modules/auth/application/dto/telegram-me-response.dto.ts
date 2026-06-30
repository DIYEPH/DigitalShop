export interface TelegramMeResponseDto {
  channel: 'telegram';
  user: {
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
  };
}

