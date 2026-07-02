import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AUTH_USER_REPOSITORY } from '../../auth.tokens';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { TelegramMeResponseDto } from '../dto/telegram-me-response.dto';

@Injectable()
export class GetTelegramMeUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
  ) {}

  async execute(shopId: string, telegramId: number): Promise<TelegramMeResponseDto> {
    const user = await this.authUserRepository.findTelegramMeById(shopId, telegramId);
    if (!user) {
      throw new NotFoundException('Telegram user is not linked yet.');
    }
    return { channel: 'telegram', user };
  }
}
