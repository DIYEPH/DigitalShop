import { PaymentMethod } from '../../../common/enums';

/** Phương thức hiển thị trên admin UI → enum DB */
const UI_TO_DB: Record<string, PaymentMethod> = {
  USDT: PaymentMethod.CRYPTO,
  BINANCE: PaymentMethod.BINANCE,
  BALANCE: PaymentMethod.BALANCE,
};

/** Chỉ map enum DB sang label admin UI (không gộp BANK/BALANCE_VND). */
const DB_TO_UI: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.CRYPTO]: 'USDT',
  [PaymentMethod.BINANCE]: 'BINANCE',
  [PaymentMethod.BALANCE]: 'BALANCE',
};

export function uiPaymentMethodsToDb(methods: string[]): PaymentMethod[] {
  const out = new Set<PaymentMethod>();
  for (const m of methods) {
    const mapped = UI_TO_DB[m.toUpperCase()];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

export function dbPaymentMethodsToUi(methods: string[]): string[] {
  const out = new Set<string>();
  for (const m of methods) {
    const mapped = DB_TO_UI[m as PaymentMethod];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

export function parsePgEnumArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((it) => String(it));
  if (typeof value === 'string') {
    const trimmed = value.replace(/^\{|\}$/g, '').trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((s) => s.trim());
  }
  return [];
}
