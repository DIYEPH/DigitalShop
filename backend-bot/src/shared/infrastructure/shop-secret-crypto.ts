import { createDecipheriv, createHash } from 'crypto';

/**
 * Mirrors admin-backend ShopSettingsService encryption:
 * value = `v1:<iv>:<authTag>:<ciphertext>` (base64url), AES-256-GCM,
 * key = sha256(SHOP_SECRET_ENCRYPTION_KEY || CREDENTIAL_ENCRYPTION_KEY || JWT_SECRET || dev fallback).
 */
function encryptionKey(): Buffer {
  const keyMaterial =
    process.env.SHOP_SECRET_ENCRYPTION_KEY ||
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'digitalshop-dev-secret';
  return createHash('sha256').update(keyMaterial).digest();
}

export function decryptShopSecretJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const [version, ivPart, tagPart, cipherPart] = value.split(':');
    if (version !== 'v1' || !ivPart || !tagPart || !cipherPart) return {};
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const parsed: unknown = JSON.parse(plaintext);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
