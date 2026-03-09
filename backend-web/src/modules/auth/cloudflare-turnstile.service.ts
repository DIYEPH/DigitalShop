import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

@Injectable()
export class CloudflareTurnstileService {
  constructor(private readonly config: ConfigService) {}

  async verify(token: string | undefined, remoteIp: string | null): Promise<void> {
    const required = this.config.get<string>('AUTH_TURNSTILE_REQUIRED') === 'true';
    const secret = this.config.get<string>('CLOUDFLARE_TURNSTILE_SECRET_KEY');

    if (!required && !token) return;

    if (!token) {
      throw new BadRequestException('Cloudflare Turnstile token is required');
    }

    if (!secret) {
      throw new ServiceUnavailableException('Cloudflare Turnstile is not configured');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp) body.set('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('Cloudflare Turnstile verification failed');
    }

    const payload = (await response.json()) as TurnstileVerifyResponse;
    if (!payload.success) {
      throw new BadRequestException({
        message: 'Cloudflare Turnstile token is invalid',
        codes: payload['error-codes'] ?? [],
      });
    }
  }
}
