export function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("vi-VN")} ${currency}`;
}

export function orderStatusVariant(status: string) {
  if (status === "COMPLETED" || status === "PAID") return "success";
  if (status === "CANCELLED" || status === "FAILED") return "danger";
  if (status === "PENDING" || status === "PROCESSING") return "accent";
  return "secondary";
}
