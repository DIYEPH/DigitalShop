import { AuthUserEntity } from '../../domain/entities/auth-user.entity';

export interface TelegramAuthResponseDto {
  channel: 'telegram';
  user: AuthUserEntity;
}
