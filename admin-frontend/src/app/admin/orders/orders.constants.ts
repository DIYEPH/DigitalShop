export function orderStatusVariant(status: string) {
  if (status === "COMPLETED" || status === "PAID") return "success";
  if (status === "CANCELLED" || status === "FAILED") return "danger";
  if (status === "PENDING" || status === "PROCESSING") return "accent";
  return "secondary";
}
