import { Inject, Injectable } from '@nestjs/common';
import { TelegramLoginDto } from '../dto/telegram-login.dto';
import { TelegramAuthResponseDto } from '../dto/telegram-auth-response.dto';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { AUTH_USER_REPOSITORY } from '../../auth.tokens';

@Injectable()
export class TelegramLoginUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(shopId: string, input: TelegramLoginDto): Promise<TelegramAuthResponseDto> {
    const user = await this.authUserRepository.getOrCreateByTelegramIdentity(shopId, {
      telegramId: input.telegram_id,
      username: input.username,
      fullName: input.full_name,
    });

    return {
      channel: 'telegram',
      user,
    };
  }
}
