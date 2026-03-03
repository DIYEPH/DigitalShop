import { HttpException } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super({ error: { code, message, ...(details ? { details } : {}) } }, status);
  }
}
