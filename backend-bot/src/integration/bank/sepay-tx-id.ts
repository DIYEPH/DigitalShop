import { SepayTransaction } from './sepay.gateway';

function transactionContent(tx: SepayTransaction): string {
  return String(tx.transaction_content ?? tx.content ?? tx.description ?? '').trim();
}

/** Idempotent key for balance_topups.tx_id (UNIQUE) when crediting bank topup. */
export function buildSepayTopupTxId(tx: SepayTransaction): string {
  const rawId = tx.id ?? tx.transaction_id;
  if (rawId != null && String(rawId).trim()) {
    return `sepay:${String(rawId).trim()}`;
  }
  const content = transactionContent(tx).slice(0, 48);
  const amount = tx.amount_in ?? tx.amount ?? 0;
  const date = tx.transaction_date ?? '';
  return `sepay:${date}:${amount}:${content}`;
}
