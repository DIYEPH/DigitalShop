/** BINANCE / BANK: đối soát bằng payment_code; tx_id luôn NULL. */
export function usesPaymentCode(method: string): boolean {
  return method === 'BINANCE' || method === 'BANK';
}

/** CRYPTO: đối soát bằng tx_id (hash on-chain); payment_code luôn NULL. */
export function usesTxId(method: string): boolean {
  return method === 'CRYPTO';
}
