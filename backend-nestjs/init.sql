BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Kiểu ENUM

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
-- ---------------------------------------------------------------------------
-- Người dùng, số dư crypto, điểm và giao dịch điểm
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  -- NULL = web-only user chưa link Telegram; bot user có telegram_id thật
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
-- Danh mục (phân cấp)
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

-- ---------------------------------------------------------------------------
-- Sản phẩm: plans, biến thể, giá, tier theo số lượng
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_vi TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NULL,
  emoji_id TEXT NULL,
  category_id INT NOT NULL REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category_id ON products(category_id);

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
-- Mã giảm giá
-- ---------------------------------------------------------------------------
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- Đặt hàng — đơn, dòng đơn, chat đơn
-- Khối đơn: currency + payment_method lưu phương thức thanh toán (USDT, BINANCE, BALANCE, ...)
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id),
  payment_code TEXT NULL UNIQUE, -- BINANCE/BANK: memo; CRYPTO/BALANCE: luôn NULL
  tx_id TEXT NULL UNIQUE,        -- CRYPTO: hash on-chain; BINANCE/BANK/BALANCE: luôn NULL
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
CREATE INDEX idx_orders_coupon_id ON orders(coupon_id) WHERE coupon_id IS NOT NULL;
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX idx_orders_user_pending_method ON orders(user_id, payment_method) WHERE status = 'PENDING';
CREATE INDEX idx_orders_pending_timed_expire ON orders(created_at)
  WHERE status = 'PENDING'
    AND payment_method IN ('BINANCE', 'CRYPTO', 'BANK');

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
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INT NULL REFERENCES order_items(id) ON DELETE SET NULL,
  user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_role order_sender_role_enum NOT NULL,
  kind order_message_kind_enum NOT NULL DEFAULT 'TEXT',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_messages_order_id ON order_messages(order_id);

-- ---------------------------------------------------------------------------
-- Kho
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
-- Thanh toán: mã nội dung chuyển khoản + trạng thái xác nhận
-- ---------------------------------------------------------------------------

CREATE TABLE balance_topups (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider product_payment_method_enum NOT NULL DEFAULT 'BINANCE',
  currency currency_enum NOT NULL DEFAULT 'USDT',
  amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
  payment_code TEXT NOT NULL UNIQUE,
  tx_id TEXT NULL UNIQUE,
  status payment_status_enum NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_balance_topups_user_id ON balance_topups(user_id);
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
-- Giao diện storefront (theme)
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
