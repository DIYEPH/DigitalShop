/** Mã giới thiệu — cùng thuật toán bot (`generateReferralCode`). */
export function generateReferralCode(telegramId: number): string {
  const base = telegramId.toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}${random}`;
}
