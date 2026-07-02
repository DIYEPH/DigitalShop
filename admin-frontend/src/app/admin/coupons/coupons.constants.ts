import type { AdminCreateCouponInput, GrantForm } from "./coupons.types";

export const emptyForm: AdminCreateCouponInput = {
  code: "",
  discount_type: "PERCENT",
  percent_bps: 2000,
  cost_point: 0,
  visibility: "PUBLIC",
  requires_ownership: false,
};

export const emptyGrant: GrantForm = {
  user_ids: "",
  code: "",
  quantity: "1",
};

export function toDatetimeLocal(value?: string | null): string | undefined {
  if (!value) return undefined;
  // Accept already-in datetime-local format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
