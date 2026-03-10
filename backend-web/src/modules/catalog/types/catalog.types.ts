export type StorefrontPaymentMethod = 'USDT' | 'BINANCE' | 'BALANCE';
export type StorefrontCurrency = 'USDT';
export type StorefrontLanguage = 'en' | 'vi';

export type CategoryResponse = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
  products_count?: number;
  parent_id: number | null;
  parent?: { id: number; slug: string; name: string } | null;
  children?: CategoryResponse[];
};

export type ProductPlanResponse = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
};

export type VolumeTierResponse = {
  min_quantity: number;
  discount_bps: number;
};

export type ProductVariantResponse = {
  id: number;
  name: string;
  is_active: boolean;
  plan_id: number | null;
  fulfillment_type: 'IN_STOCK' | 'PREORDER';
  preorder_limit: number | null;
  preorder_delivery_hours: number | null;
  preorder_remaining: number | null;
  available_stock_count: number;
  warranty_type: string;
  warranty_value: number | null;
  warranty_unit: string | null;
  prices: Partial<Record<StorefrontCurrency, number>>;
  promo_ends_at: string | null;
  promo_percent_bps: number | null;
  volume_tiers: VolumeTierResponse[];
};

export type ProductResponse = {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: StorefrontCurrency;
  prices: Partial<Record<StorefrontCurrency, number>>;
  payment_methods: StorefrontPaymentMethod[];
  sold_count: number;
  badges: Array<'popular' | 'hot' | 'new'>;
  in_stock: boolean;
  image_url: string | null;
  category_id: number;
  category: CategoryResponse | null;
  plans: ProductPlanResponse[];
  variants: ProductVariantResponse[];
  created_at: string;
  updated_at: string;
};
