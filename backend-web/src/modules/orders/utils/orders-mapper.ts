import {
  DbPaymentMethod,
  StorefrontPaymentMethod,
  WalletNetwork,
} from '../types/orders.types';

export const PENDING_PAYMENT_TIMEOUT_MS = 10 * 60 * 1000;

export function paymentMethodToDb(method: StorefrontPaymentMethod): DbPaymentMethod {
  return method === 'USDT' ? 'CRYPTO' : method;
}

export function paymentMethodToApi(method: string): StorefrontPaymentMethod {
  return method === 'CRYPTO' ? 'USDT' : (method as StorefrontPaymentMethod);
}

export function allowedDbPaymentMethods(methods: unknown): DbPaymentMethod[] {
  const values = Array.isArray(methods)
    ? methods
    : typeof methods === 'string'
      ? methods.replace(/[{}"]/g, '').split(',')
      : [];

  return values
    .map((value) => String(value).trim())
    .filter((value): value is DbPaymentMethod => value === 'CRYPTO' || value === 'BINANCE' || value === 'BALANCE');
}

export function roundUsdt(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function buildOrderExpiry(createdAt: Date, paymentMethod: string): { expires_at: string | null; seconds_left: number | null } {
  if (paymentMethod === 'BALANCE') {
    return { expires_at: null, seconds_left: null };
  }

  const expiresMs = createdAt.getTime() + PENDING_PAYMENT_TIMEOUT_MS;
  const secondsLeft = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
  return { expires_at: new Date(expiresMs).toISOString(), seconds_left: secondsLeft };
}

export function normalizeNetwork(network: WalletNetwork | undefined): WalletNetwork {
  return network ?? 'TRC20';
}

export function generatePaymentCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
