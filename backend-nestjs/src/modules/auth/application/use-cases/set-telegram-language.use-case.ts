import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AUTH_USER_REPOSITORY } from '../../auth.tokens';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { TelegramAuthResponseDto } from '../dto/telegram-auth-response.dto';

@Injectable()
export class SetTelegramLanguageUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(
    telegramId: number,
    language: 'en' | 'vi' | 'ru' | 'zh',
  ): Promise<TelegramAuthResponseDto> {
    const user = await this.authUserRepository.updateLanguageByTelegramId(
      telegramId,
      language,
    );
    if (!user) {
      throw new NotFoundException('Telegram user is not linked yet.');
    }
    return { channel: 'telegram', user };
  }
}
