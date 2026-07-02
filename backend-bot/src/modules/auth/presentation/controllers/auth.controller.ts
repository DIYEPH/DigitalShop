import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { TelegramLoginDto } from '../../application/dto/telegram-login.dto';
import { TelegramLoginUseCase } from '../../application/use-cases/telegram-login.use-case';
import { BotShopId } from '../decorators/bot-shop.decorator';
import { BotSecretGuard } from '../guards/bot-secret.guard';
import { GetTelegramMeUseCase } from '../../application/use-cases/get-telegram-me.use-case';
import { UpdateLanguageDto } from '../../application/dto/update-language.dto';
import { SetTelegramLanguageUseCase } from '../../application/use-cases/set-telegram-language.use-case';

@Controller('auth/telegram')
@UseGuards(BotSecretGuard)
export class AuthController {
  constructor(
    private readonly telegramLoginUseCase: TelegramLoginUseCase,
    private readonly getTelegramMeUseCase: GetTelegramMeUseCase,
    private readonly setTelegramLanguageUseCase: SetTelegramLanguageUseCase,
  ) {}

  @Post('login')
  async telegramLogin(@BotShopId() shopId: string, @Body() body: TelegramLoginDto) {
    return { data: await this.telegramLoginUseCase.execute(shopId, body) };
  }

  @Get('me/:telegramId')
  async telegramMe(
    @BotShopId() shopId: string,
    @Param('telegramId', ParseIntPipe) telegramId: number,
  ) {
    return { data: await this.getTelegramMeUseCase.execute(shopId, telegramId) };
  }

  @Post('language')
  async setLanguage(@Body() body: UpdateLanguageDto) {
    return {
      data: await this.setTelegramLanguageUseCase.execute(
        body.telegram_id,
        body.language,
      ),
    };
  }
}
