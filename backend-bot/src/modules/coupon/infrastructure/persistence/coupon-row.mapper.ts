import { CouponRow } from '../../../order/domain/order-pricing';

export function mapCouponRow(row: {
  id: number;
  code: string;
  variant_id: number;
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  visibility: string;
  requires_ownership: boolean;
  discount_type: string;
  percent_bps: number | null;
  amount_usdt: string | number | null;
  amount_vnd: string | number | null;
  max_redemptions: number | null;
  per_user_limit: number | null;
  cost_point?: number | null;
}): CouponRow {
  return {
    id: row.id,
    code: row.code,
    variantId: row.variant_id,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    visibility: row.visibility,
    requiresOwnership: row.requires_ownership,
    discountType: row.discount_type,
    percentBps: row.percent_bps != null ? Number(row.percent_bps) : null,
    amountUsdt: row.amount_usdt != null ? Number(row.amount_usdt) : null,
    amountVnd: row.amount_vnd != null ? Number(row.amount_vnd) : null,
    maxRedemptions: row.max_redemptions != null ? Number(row.max_redemptions) : null,
    perUserLimit: row.per_user_limit != null ? Number(row.per_user_limit) : null,
    costPoint: row.cost_point != null ? Number(row.cost_point) : undefined,
  };
}

export const COUPON_SELECT = `
  c.id,
  c.code,
  c.variant_id,
  c.is_active,
  c.starts_at,
  c.ends_at,
  c.visibility,
  c.requires_ownership,
  c.discount_type,
  c.percent_bps,
  c.amount_usdt,
  c.amount_vnd,
  c.max_redemptions,
  c.per_user_limit,
  c.cost_point
`;
