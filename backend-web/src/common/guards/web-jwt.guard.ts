import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../modules/auth/auth.service';
import { AuthUser, JwtPayload } from '../../modules/auth/types/auth-user';

export type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
};

@Injectable()
export class WebJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing auth token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.authService.getActiveUserById(payload.sub);

      if (!user || user.email !== payload.email || user.role !== 'USER') {
        throw new UnauthorizedException('Invalid auth token');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid auth token');
    }
  }

  private extractBearerToken(header: string | string[] | undefined): string | null {
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}
