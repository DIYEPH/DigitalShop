import {
  StorefrontLanguage,
  StorefrontPaymentMethod,
} from '../types/catalog.types';

export function languageFromCountry(country: string | string[] | undefined): StorefrontLanguage {
  const value = Array.isArray(country) ? country[0] : country;
  return value?.toUpperCase() === 'VN' ? 'vi' : 'en';
}

export function localizedText(row: Record<string, unknown>, base: string, language: StorefrontLanguage): string {
  const localized = row[`${base}_${language}`];
  const fallback = row[`${base}_en`];
  return String(localized ?? fallback ?? '');
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

export function parseDbPaymentMethods(value: unknown): StorefrontPaymentMethod[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.replace(/[{}"]/g, '').split(',')
      : [];

  const mapped = rawItems
    .map((item) => String(item).trim())
    .filter(Boolean)
    .map((item) => (item === 'CRYPTO' ? 'USDT' : item))
    .filter((item): item is StorefrontPaymentMethod => item === 'USDT' || item === 'BINANCE' || item === 'BALANCE');

  return Array.from(new Set(mapped));
}
