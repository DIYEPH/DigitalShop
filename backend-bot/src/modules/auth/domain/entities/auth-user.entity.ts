export interface AuthUserEntity {
  id: number;
  telegramId: number;
  username: string | null;
  fullName: string | null;
  language: 'en' | 'vi' | 'ru' | 'zh';
  role: 'USER' | 'ADMIN';
}
