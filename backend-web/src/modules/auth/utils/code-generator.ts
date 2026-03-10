import { randomBytes, randomInt } from 'crypto';

const HUMAN_SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generatePublicCode(prefix: string, length = 8): string {
  let code = prefix;
  for (let index = 0; index < length; index += 1) {
    code += HUMAN_SAFE_ALPHABET[randomInt(0, HUMAN_SAFE_ALPHABET.length)];
  }
  return code;
}

export function generateReferralCode(): string {
  return `WEB${randomBytes(4).toString('hex').toUpperCase()}`;
}
