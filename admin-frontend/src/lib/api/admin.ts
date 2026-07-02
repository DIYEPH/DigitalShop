import { apiFetch, apiFetchPaginated } from "./client";

export type AdminOrder = {
  id: string;
  user: { id: number; email: string } | null;
  total_price: number;
  currency: string;
  payment_method: string;
  payment_code: string | null;
  status: string;
  item_count: number;
  reserved_count?: number;
  delivered_count?: number;
  open_warranty_count?: number;
  created_at: string;
  updated_at: string;
};

type AdminOrderItem = {
  id: number;
  variant_id: number;
  quantity: number;
  unit_price: number;
  snapshot_variant_name: string;
  snapshot_fulfillment_type: string;
  snapshot_warranty_type: string;
  snapshot_warranty_value: number | null;
  snapshot_warranty_unit: string | null;
  reserved_count: number;
  delivered_count: number;
};

export type AdminOrderDetail = AdminOrder & {
  tx_id: string | null;
  coupon_id: number | null;
  delivery_note: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  items: AdminOrderItem[];
};

export type AdminOrderMessage = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number | null;
  sender_role: "USER" | "ADMIN";
  kind: "TEXT" | "WARRANTY_REQUEST" | "SYSTEM";
  message: string;
  created_at: string;
};

export type AdminWarrantyRequest = {
  id: number;
  order_id: string;
  order_item_id: number | null;
  user_id: number;
  reason: string;
  days_used: number | null;
  status: "OPEN" | "REPLACED" | "REFUNDED" | "REJECTED";
  resolution_note: string | null;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
  variant_id: number | null;
  snapshot_variant_name: string | null;
  warranty_type: string | null;
};

export async function adminListWarrantyRequests(token: string, orderId: string) {
  return apiFetch<{ requests: AdminWarrantyRequest[] }>(
    `/api/admin/v1/orders/${orderId}/warranty-requests`,
    { method: "GET", token, cache: "no-store" },
  );
}

export async function adminResolveWarranty(
  token: string,
  orderId: string,
  requestId: number,
  input: {
    resolution: "REPLACED" | "REFUNDED" | "REJECTED";
    payload?: string;
    note?: string;
  },
) {
  return apiFetch<{ id: number; status: string }>(
    `/api/admin/v1/orders/${orderId}/warranty-requests/${requestId}/resolve`,
    { method: "POST", token, body: input, cache: "no-store" },
  );
}

export async function adminListOrderMessages(token: string, orderId: string) {
  return apiFetch<{ messages: AdminOrderMessage[] }>(
    `/api/admin/v1/orders/${orderId}/messages`,
    { method: "GET", token, cache: "no-store" },
  );
}

export async function adminPostOrderMessage(
  token: string,
  orderId: string,
  input: {
    message: string;
    kind?: "TEXT" | "WARRANTY_REQUEST" | "SYSTEM";
    order_item_id?: number;
  },
) {
  return apiFetch<AdminOrderMessage>(
    `/api/admin/v1/orders/${orderId}/messages`,
    { method: "POST", token, body: input, cache: "no-store" },
  );
}

export async function adminListOrders(
  token: string,
  args: {
    page?: number;
    limit?: number;
    status?: string;
    payment_code?: string;
    warranty?: "open";
  } = {},
) {
  const qs = new URLSearchParams();
  if (args.page) qs.set("page", String(args.page));
  if (args.limit) qs.set("limit", String(args.limit));
  if (args.status) qs.set("status", args.status);
  if (args.payment_code) qs.set("payment_code", args.payment_code);
  if (args.warranty) qs.set("warranty", args.warranty);
  return apiFetchPaginated<{ orders: AdminOrder[] }>(
    `/api/admin/v1/orders?${qs.toString()}`,
    {
      method: "GET",
      token,
      cache: "no-store",
    },
  );
}

export async function adminGetOrder(token: string, orderId: string) {
  return apiFetch<AdminOrderDetail>(`/api/admin/v1/orders/${orderId}`, {
    method: "GET",
    token,
    cache: "no-store",
  });
}

export async function adminConfirmOrder(
  token: string,
  orderId: string,
  transaction_hash?: string,
) {
  return apiFetch<{ id: string; status: string; message: string }>(
    `/api/admin/v1/orders/${orderId}/confirm`,
    {
      method: "POST",
      token,
      body: transaction_hash ? { transaction_hash } : {},
      cache: "no-store",
    },
  );
}

export type AdminCoupon = {
  id: number;
  code: string;
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  variant_label: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
  requires_ownership?: boolean;
  discount_type: "PERCENT" | "FIXED";
  percent_bps: number | null;
  amount_usdt: string | null;
  amount_vnd: string | null;
  cost_point: number;
  max_redemptions: number | null;
  per_user_limit: number | null;
  created_at: string;
  updated_at?: string;
};

export async function adminListCoupons(token: string) {
  return apiFetch<{ coupons: AdminCoupon[] }>(`/api/admin/v1/coupons`, {
    method: "GET",
    token,
    cache: "no-store",
  });
}

export type AdminCreateCouponInput = {
  code: string;
  visibility?: "PUBLIC" | "PRIVATE";
  requires_ownership?: boolean;
  variant_id?: number;
  discount_type: "PERCENT" | "FIXED";
  percent_bps?: number;
  amount_usdt?: number;
  amount_vnd?: number;
  cost_point?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
  max_redemptions?: number;
  per_user_limit?: number;
};

export async function adminCreateCoupon(
  token: string,
  input: AdminCreateCouponInput,
) {
  return apiFetch<AdminCoupon>(`/api/admin/v1/coupons`, {
    method: "POST",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminUpdateCoupon(
  token: string,
  id: number,
  input: Partial<AdminCreateCouponInput>,
) {
  return apiFetch<AdminCoupon>(`/api/admin/v1/coupons/${id}`, {
    method: "PATCH",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminGrantCouponToUser(
  token: string,
  input: {
    user_id?: number;
    user_ids?: number[] | string;
    code: string;
    quantity?: number;
  },
) {
  return apiFetch<{
    coupon_id: number;
    code: string;
    results: Array<{
      user_id: number;
      ok: boolean;
      granted: number;
      owned_total?: number;
      error?: string;
    }>;
  }>(`/api/admin/v1/coupons/grant`, {
    method: "POST",
    token,
    body: input,
    cache: "no-store",
  });
}

export type AdminProduct = {
  id: number;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  /** @deprecated dùng name_en */
  name: string;
  slug: string;
  /** @deprecated dùng description_en */
  description: string;
  price_usdt: number;
  price_vnd: number;
  price: number;
  currency: string;
  image_url?: string | null;
  category?: { id: number; name: string; slug: string } | null;
};

export async function adminListProducts(
  token: string,
  args: { page?: number; limit?: number } = {},
) {
  const qs = new URLSearchParams();
  if (args.page) qs.set("page", String(args.page));
  if (args.limit) qs.set("limit", String(args.limit));
  return apiFetchPaginated<AdminProduct[]>(
    `/api/admin/v1/products?${qs.toString()}`,
    { method: "GET", token, cache: "no-store" },
  );
}

export async function adminCreateProduct(
  token: string,
  input: Record<string, unknown>,
) {
  return apiFetch<AdminProduct>(`/api/admin/v1/products`, {
    method: "POST",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminUpdateProduct(
  token: string,
  id: number,
  input: Record<string, unknown>,
) {
  return apiFetch<AdminProduct>(`/api/admin/v1/products/${id}`, {
    method: "PUT",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminDeleteProduct(token: string, id: number) {
  return apiFetch<{ message: string }>(`/api/admin/v1/products/${id}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}

export type AdminPlan = {
  id: number;
  slug: string;
  name_en: string;
  name_vi: string;
  /** @deprecated dùng name_en */
  name: string;
  sort_order: number;
  is_active: boolean;
};

type AdminVariantPrice = { currency: "USDT" | "VND"; amount: string };

export type AdminVolumeTier = {
  id?: number;
  min_quantity: number;
  discount_bps: number;
  is_active?: boolean;
};

export type AdminVariant = {
  id: number;
  plan_id: number | null;
  plan: { id: number; slug: string; name: string } | null;
  name_en: string;
  name_vi: string;
  /** @deprecated dùng name_en */
  name: string;
  sku: string | null;
  fulfillment_type?: "IN_STOCK" | "PREORDER";
  preorder_limit?: number | null;
  preorder_delivery_hours?: number | null;
  warranty_type: "LOGIN" | "CUSTOM" | "NONE";
  warranty_value?: number | null;
  warranty_unit?: "HOUR" | "DAY" | "MONTH" | "YEAR" | null;
  sort_order: number;
  is_active: boolean;
  prices: AdminVariantPrice[];
  volume_tiers?: AdminVolumeTier[];
  payment_methods?: Array<"USDT" | "BINANCE" | "BALANCE">;
  /** Tổng dòng kho (mọi trạng thái) — dùng chặn đổi sang PREORDER */
  stock_item_count?: number;
};

export type AdminProductDetail = {
  id: number;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  category_id: number;
  plans: AdminPlan[];
  variants: AdminVariant[];
};

export async function adminGetProduct(token: string, productId: number) {
  return apiFetch<AdminProductDetail>(`/api/admin/v1/products/${productId}`, {
    method: "GET",
    token,
    cache: "no-store",
  });
}

export async function adminCreatePlan(
  token: string,
  productId: number,
  input: {
    slug: string;
    name_en: string;
    name_vi: string;
    sort_order?: number;
    is_active?: boolean;
  },
) {
  return apiFetch<AdminPlan>(`/api/admin/v1/products/${productId}/plans`, {
    method: "POST",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminUpdatePlan(
  token: string,
  productId: number,
  planId: number,
  input: {
    name_en?: string;
    name_vi?: string;
    sort_order?: number;
    is_active?: boolean;
  },
) {
  return apiFetch<AdminPlan>(
    `/api/admin/v1/products/${productId}/plans/${planId}`,
    { method: "PUT", token, body: input, cache: "no-store" },
  );
}

export async function adminDeletePlan(
  token: string,
  productId: number,
  planId: number,
) {
  return apiFetch<{ message: string }>(
    `/api/admin/v1/products/${productId}/plans/${planId}`,
    { method: "DELETE", token, cache: "no-store" },
  );
}

export async function adminCreateVariant(
  token: string,
  productId: number,
  input: Record<string, unknown>,
) {
  return apiFetch<AdminVariant>(
    `/api/admin/v1/products/${productId}/variants`,
    { method: "POST", token, body: input, cache: "no-store" },
  );
}

export async function adminUpdateVariant(
  token: string,
  variantId: number,
  input: Record<string, unknown>,
) {
  return apiFetch<AdminVariant>(
    `/api/admin/v1/products/variants/${variantId}`,
    { method: "PUT", token, body: input, cache: "no-store" },
  );
}

export async function adminDeleteVariant(token: string, variantId: number) {
  return apiFetch<{ message: string }>(
    `/api/admin/v1/products/variants/${variantId}`,
    { method: "DELETE", token, cache: "no-store" },
  );
}

export async function adminListVolumeTiers(token: string, variantId: number) {
  return apiFetch<AdminVolumeTier[]>(
    `/api/admin/v1/products/variants/${variantId}/volume-tiers`,
    {
      method: "GET",
      token,
      cache: "no-store",
    },
  );
}

export async function adminReplaceVolumeTiers(
  token: string,
  variantId: number,
  tiers: AdminVolumeTier[],
) {
  return apiFetch<AdminVolumeTier[]>(
    `/api/admin/v1/products/variants/${variantId}/volume-tiers`,
    {
      method: "PUT",
      token,
      body: { tiers },
      cache: "no-store",
    },
  );
}

export type AdminStockItem = {
  id: number;
  product_id: number;
  variant_id: number;
  status: "AVAILABLE" | "RESERVED" | "DELIVERED";
  payload: string;
  note: string | null;
  order_id: string | null;
  reserved_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export async function adminListStock(
  token: string,
  args: {
    product_id?: number;
    variant_id?: number;
    order_id?: string;
    status?: string;
  } = {},
) {
  const qs = new URLSearchParams();
  if (args.product_id) qs.set("product_id", String(args.product_id));
  if (args.variant_id) qs.set("variant_id", String(args.variant_id));
  if (args.order_id) qs.set("order_id", args.order_id);
  if (args.status) qs.set("status", args.status);
  return apiFetch<{ items: AdminStockItem[] }>(
    `/api/admin/v1/stock?${qs.toString()}`,
    { method: "GET", token, cache: "no-store" },
  );
}

export async function adminUpdateStock(
  token: string,
  stockItemId: number,
  input: { payload: string; note?: string },
) {
  return apiFetch<AdminStockItem>(`/api/admin/v1/stock/${stockItemId}`, {
    method: "PUT",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminAddStock(
  token: string,
  input: { variant_id: number; payloads: string | string[]; note?: string },
) {
  return apiFetch<{ created: number }>(`/api/admin/v1/stock`, {
    method: "POST",
    token,
    body: input,
    cache: "no-store",
  });
}

export async function adminDeleteStock(token: string, stockItemId: number) {
  return apiFetch<{ message: string }>(`/api/admin/v1/stock/${stockItemId}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}

export async function adminDeliverOrder(
  token: string,
  orderId: string,
  delivery_note?: string,
) {
  return apiFetch<{ id: string; status: string; delivered_at: string | null }>(
    `/api/admin/v1/orders/${orderId}/deliver`,
    {
      method: "POST",
      token,
      body: delivery_note ? { delivery_note } : {},
      cache: "no-store",
    },
  );
}
