import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CloudflareTurnstileService } from './cloudflare-turnstile.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthResponse } from './types/auth-user';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstileService: CloudflareTurnstileService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDto, @Req() request: RequestLike): Promise<AuthResponse> {
    await this.turnstileService.verify(dto.turnstile_token, this.getClientIp(request));
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: RequestLike): Promise<AuthResponse> {
    await this.turnstileService.verify(dto.turnstile_token, this.getClientIp(request));
    return this.authService.login(dto.email, dto.password);
  }

  private getClientIp(request: RequestLike): string | null {
    const cfConnectingIp = request.headers['cf-connecting-ip'];
    if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
      return cfConnectingIp;
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip ?? request.socket?.remoteAddress ?? null;
  }
}
