import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BotShopContext } from '../guards/bot-secret.guard';

/** Shop id resolved by BotSecretGuard from the x-bot-secret header. */
export const BotShopId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  const req = context.switchToHttp().getRequest<{ botShop?: BotShopContext }>();
  if (!req.botShop) {
    throw new UnauthorizedException('Bot shop context missing.');
  }
  return req.botShop.shopId;
});
