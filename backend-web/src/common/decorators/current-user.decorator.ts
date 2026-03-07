import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../modules/auth/types/auth-user';
import { RequestWithUser } from '../guards/web-jwt.guard';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) {
    throw new Error('CurrentUser decorator used without WebJwtGuard');
  }
  return request.user;
});
