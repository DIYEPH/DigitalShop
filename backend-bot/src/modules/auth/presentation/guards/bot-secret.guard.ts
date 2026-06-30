import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class BotSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const providedSecret = req.headers['x-bot-secret'];
    const expectedSecret = process.env.BOT_INTERNAL_SECRET;

    if (!expectedSecret) {
      throw new UnauthorizedException('Bot secret is not configured.');
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid bot secret.');
    }

    return true;
  }
}
