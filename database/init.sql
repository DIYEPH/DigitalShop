BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums

CREATE TYPE role_enum AS ENUM ('USER', 'ADMIN');
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'PAID', 'DELIVERED', 'CANCELLED');
CREATE TYPE stock_status_enum AS ENUM ('AVAILABLE', 'RESERVED', 'DELIVERED');
CREATE TYPE warranty_type_enum AS ENUM ('LOGIN', 'CUSTOM', 'NONE');
CREATE TYPE warranty_unit_enum AS ENUM ('HOUR', 'DAY', 'MONTH', 'YEAR');
CREATE TYPE coupon_discount_type_enum AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE coupon_visibility_enum AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE fulfillment_type_enum AS ENUM ('IN_STOCK', 'PREORDER');
CREATE TYPE order_message_kind_enum AS ENUM ('TEXT', 'WARRANTY_REQUEST', 'SYSTEM');
CREATE TYPE order_sender_role_enum AS ENUM ('USER', 'ADMIN');
CREATE TYPE idempotency_status_enum AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE point_tx_type_enum AS ENUM ('EARN', 'SPEND');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE product_payment_method_enum AS ENUM ('BINANCE', 'BALANCE', 'BALANCE_VND', 'CRYPTO', 'BANK');
CREATE TYPE currency_enum AS ENUM ('USDT', 'VND');
CREATE TYPE language_enum AS ENUM ('EN', 'VI', 'RU', 'ZH');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'BANNED');
CREATE TYPE shop_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE shop_member_role_enum AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE shop_payment_provider_enum AS ENUM ('BINANCE', 'BANK', 'SEPAY', 'CRYPTO');
CREATE TYPE shop_payment_credential_status_enum AS ENUM ('ACTIVE', 'DISABLED');
-- ---------------------------------------------------------------------------
-- Users, balances, points, and referrals
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  -- NULL means the web user has not linked a Telegram account.
  telegram_id BIGINT NULL UNIQUE,
  username TEXT,
  language language_enum NOT NULL DEFAULT 'EN',
  full_name TEXT,
  google_id TEXT NULL UNIQUE,
  password TEXT,
  topup_code TEXT NOT NULL UNIQUE,
  role role_enum NOT NULL DEFAULT 'USER',
  balance_usdt NUMERIC(36, 18) NOT NULL DEFAULT 0,
  balance_vnd NUMERIC(36, 18) NOT NULL DEFAULT 0,
  balance_point NUMERIC(36, 18) NOT NULL DEFAULT 0,
  can_create_shop BOOLEAN NOT NULL DEFAULT FALSE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by_user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status user_status_enum NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX idx_users_referred_by_user_id ON users(referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_bonus_points INT NOT NULL,
  referrer_bonus_points INT NULL,
  referee_awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer_bonus_awarded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referred_user_id)
);
CREATE INDEX idx_referrals_referrer_user_id ON referrals(referrer_user_id);

CREATE TABLE point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type point_tx_type_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);

CREATE TABLE daily_login_point_claims (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  points_awarded INT NOT NULL CHECK (points_awarded > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, claim_date)
);
CREATE INDEX idx_daily_login_point_claims_user_id_created_at ON daily_login_point_claims(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Shop / tenant foundation
-- ---------------------------------------------------------------------------
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status shop_status_enum NOT NULL DEFAULT 'ACTIVE',
  logo_url TEXT NULL,
  support_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO shops (name, slug, status)
VALUES ('Default Shop', 'default', 'ACTIVE');

CREATE OR REPLACE FUNCTION digitalshop_default_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM shops WHERE slug = 'default' LIMIT 1
$$;

CREATE TABLE shop_members (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role shop_member_role_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX idx_shop_members_user_id ON shop_members(user_id);

-- ---------------------------------------------------------------------------
-- Shared category tree
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NULL,
  emoji_id TEXT NULL,
  parent_id INT NULL REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  description_en TEXT NULL,
  description_vi TEXT NULL
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

CREATE TABLE shop_categories (
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shop_id, category_id)
);
CREATE INDEX idx_shop_categories_category_id ON shop_categories(category_id);

-- ---------------------------------------------------------------------------
-- Products, plans, variants, and volume tiers
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_vi TEXT NOT NULL,
  slug TEXT NOT NULL,
  image_url TEXT NULL,
  emoji_id TEXT NULL,
  category_id INT NOT NULL REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, slug)
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);

CREATE TABLE product_plans (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, slug)
);
CREATE INDEX idx_product_plans_product_id ON product_plans(product_id);

CREATE TABLE product_variants (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id INT NULL REFERENCES product_plans(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  fulfillment_type fulfillment_type_enum NOT NULL DEFAULT 'PREORDER',
  preorder_limit INT NULL,
  preorder_delivery_hours INT NULL,
  warranty_type warranty_type_enum NOT NULL DEFAULT 'NONE',
  warranty_value INT NULL,
  warranty_unit warranty_unit_enum NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  payment_methods product_payment_method_enum[] NOT NULL DEFAULT ARRAY['BINANCE', 'CRYPTO', 'BALANCE']::product_payment_method_enum[],
  amount_usdt NUMERIC(36, 18) NOT NULL,
  amount_vnd NUMERIC(36, 18) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_plan_id ON product_variants(plan_id);

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  code TEXT NOT NULL,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  visibility coupon_visibility_enum NOT NULL DEFAULT 'PRIVATE',
  requires_ownership BOOLEAN NOT NULL DEFAULT FALSE,
  discount_type coupon_discount_type_enum NOT NULL,
  percent_bps INT NULL,
  amount_usdt NUMERIC(15, 2) NULL,
  amount_vnd NUMERIC(15, 2) NULL,
  cost_point INT NOT NULL DEFAULT 0,
  max_redemptions INT NULL,
  per_user_limit INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, code)
);
CREATE INDEX idx_coupons_shop_id ON coupons(shop_id);

CREATE TABLE variant_volume_tiers (
  id SERIAL PRIMARY KEY,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL,
  discount_bps INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, min_quantity)
);
CREATE INDEX idx_variant_volume_tiers_variant_id ON variant_volume_tiers(variant_id);

-- ---------------------------------------------------------------------------
-- Shop payment credentials
-- ---------------------------------------------------------------------------
CREATE TABLE shop_payment_credentials (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  payment_method product_payment_method_enum NOT NULL,
  provider shop_payment_provider_enum NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  public_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status shop_payment_credential_status_enum NOT NULL DEFAULT 'ACTIVE',
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shop_payment_credentials_method_chk CHECK (
    payment_method IN ('BINANCE', 'BANK', 'CRYPTO')
  ),
  CONSTRAINT shop_payment_credentials_provider_chk CHECK (
    (payment_method = 'BINANCE' AND provider = 'BINANCE')
    OR (payment_method = 'BANK' AND provider IN ('BANK', 'SEPAY'))
    OR (payment_method = 'CRYPTO' AND provider = 'CRYPTO')
  )
);
-- One credential row per (shop, method); on/off is expressed via status, not row count.
CREATE UNIQUE INDEX ux_shop_payment_credentials_method
  ON shop_payment_credentials(shop_id, payment_method);

CREATE TABLE user_shop_balances (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  balance_usdt NUMERIC(36, 18) NOT NULL DEFAULT 0,
  balance_vnd NUMERIC(36, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_id),
  CONSTRAINT user_shop_balances_non_negative_chk CHECK (
    balance_usdt >= 0 AND balance_vnd >= 0
  )
);
CREATE INDEX idx_user_shop_balances_shop_id ON user_shop_balances(shop_id);

CREATE TABLE telegram_bots (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  bot_username TEXT NULL,
  bot_token_encrypted TEXT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  status shop_status_enum NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_telegram_bots_shop_id ON telegram_bots(shop_id);

-- ---------------------------------------------------------------------------
-- Orders, order items, and order messages
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  user_id INT NOT NULL REFERENCES users(id),
  payment_code TEXT NULL,        -- BINANCE/BANK memo; NULL for CRYPTO/BALANCE.
  tx_id TEXT NULL UNIQUE,        -- CRYPTO transaction hash; NULL for BINANCE/BANK/BALANCE.
  total_price NUMERIC(15, 2) NOT NULL,
  currency currency_enum NOT NULL DEFAULT 'USDT',
  payment_method product_payment_method_enum NOT NULL DEFAULT 'BINANCE',
  coupon_id INT NULL REFERENCES coupons(id) ON DELETE SET NULL,
  status order_status_enum NOT NULL DEFAULT 'PENDING',
  delivered_at TIMESTAMPTZ NULL,
  delivery_note TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_payment_fields_chk CHECK (
    (
      payment_method IN ('BINANCE', 'BANK')
      AND payment_code IS NOT NULL
      AND tx_id IS NULL
    )
    OR (
      payment_method = 'CRYPTO'
      AND payment_code IS NULL
    )
    OR (
      payment_method IN ('BALANCE', 'BALANCE_VND')
      AND payment_code IS NULL
      AND tx_id IS NULL
    )
  )
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_coupon_id ON orders(coupon_id) WHERE coupon_id IS NOT NULL;
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX idx_orders_user_pending_method ON orders(user_id, shop_id, payment_method) WHERE status = 'PENDING';
CREATE INDEX idx_orders_pending_timed_expire ON orders(created_at)
  WHERE status = 'PENDING'
    AND payment_method IN ('BINANCE', 'CRYPTO', 'BANK');
CREATE UNIQUE INDEX ux_orders_shop_payment_code
  ON orders(shop_id, payment_code)
  WHERE payment_code IS NOT NULL;

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INT NOT NULL REFERENCES product_variants(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(36, 18) NOT NULL CHECK (unit_price > 0),
  snapshot_variant_name TEXT NOT NULL,
  snapshot_fulfillment_type fulfillment_type_enum NOT NULL,
  snapshot_warranty_type warranty_type_enum NOT NULL,
  snapshot_warranty_value INT NULL,
  snapshot_warranty_unit warranty_unit_enum NULL
);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

CREATE TABLE order_messages (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INT NULL REFERENCES order_items(id) ON DELETE SET NULL,
  user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_role order_sender_role_enum NOT NULL,
  kind order_message_kind_enum NOT NULL DEFAULT 'TEXT',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_messages_order_id ON order_messages(order_id);
CREATE INDEX idx_order_messages_shop_id ON order_messages(shop_id);

-- ---------------------------------------------------------------------------
-- Stock
-- ---------------------------------------------------------------------------
CREATE TABLE stock_items (
  id SERIAL PRIMARY KEY,
  variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  status stock_status_enum NOT NULL DEFAULT 'AVAILABLE',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  payload TEXT NOT NULL,
  note TEXT NULL,
  order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
  reserved_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_stock_items_status_variant_id ON stock_items(status, variant_id);
CREATE INDEX idx_stock_items_order_id ON stock_items(order_id);

-- ---------------------------------------------------------------------------
-- Balance topups
-- ---------------------------------------------------------------------------

CREATE TABLE balance_topups (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider product_payment_method_enum NOT NULL DEFAULT 'BINANCE',
  currency currency_enum NOT NULL DEFAULT 'USDT',
  amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
  payment_code TEXT NOT NULL,
  tx_id TEXT NULL UNIQUE,
  status payment_status_enum NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, payment_code)
);
CREATE INDEX idx_balance_topups_user_id ON balance_topups(user_id);
CREATE INDEX idx_balance_topups_shop_id ON balance_topups(shop_id);
CREATE INDEX idx_balance_topups_pending ON balance_topups(status, created_at) WHERE status = 'PENDING';

CREATE TABLE user_coupons (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id INT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL,
  order_id UUID NULL UNIQUE REFERENCES orders(id) ON DELETE SET NULL
);
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);

-- ---------------------------------------------------------------------------
-- Storefront theme
-- ---------------------------------------------------------------------------
CREATE TABLE theme_config (
  id SERIAL PRIMARY KEY,
  theme TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  priority INT NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_carousel (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  image_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_carousel_active_window ON event_carousel(is_active, start_at, end_at, priority);

COMMIT;
