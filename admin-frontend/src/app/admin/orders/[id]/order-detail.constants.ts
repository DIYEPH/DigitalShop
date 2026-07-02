export function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("vi-VN")} ${currency}`;
}

export function orderStatusVariant(status: string) {
  if (status === "DELIVERED" || status === "PAID") return "success";
  if (status === "CANCELLED" || status === "FAILED") return "danger";
  if (status === "PENDING" || status === "PROCESSING") return "accent";
  return "secondary";
}

export function stockStatusVariant(status: string) {
  if (status === "DELIVERED") return "success";
  if (status === "RESERVED") return "accent";
  return "secondary";
}
