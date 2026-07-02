-- Multi-shop support for the Telegram bot stack:
--   1. telegram_bots.secret_encrypted lets the platform decrypt the internal
--      secret and launch one bot runner instance per shop.
--   2. user_shop_balances.balance_point: loyalty points become per-shop.
--   3. point_transactions / daily_login_point_claims / referrals gain shop_id.
--      NULL shop_id = legacy/global web flow (backend-web me/points is not
--      shop-scoped yet); bot flows always set shop_id.
--   4. Wallet money (balance_usdt/balance_vnd) moves from users.* into
--      user_shop_balances of the oldest shop; loyalty points are copied so bot
--      users keep their balance (users.balance_point stays as the web pool).

-- 1. telegram_bots ------------------------------------------------------------
ALTER TABLE telegram_bots
  ADD COLUMN IF NOT EXISTS secret_encrypted TEXT NULL;

-- 2. per-shop point balance ---------------------------------------------------
ALTER TABLE user_shop_balances
  ADD COLUMN IF NOT EXISTS balance_point NUMERIC(36, 18) NOT NULL DEFAULT 0;

ALTER TABLE user_shop_balances
  DROP CONSTRAINT IF EXISTS user_shop_balances_non_negative_chk;
ALTER TABLE user_shop_balances
  ADD CONSTRAINT user_shop_balances_non_negative_chk CHECK (
    balance_usdt >= 0 AND balance_vnd >= 0 AND balance_point >= 0
  );

-- 3. shop scope for loyalty tables -------------------------------------------
ALTER TABLE point_transactions
  ADD COLUMN IF NOT EXISTS shop_id UUID NULL REFERENCES shops(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_point_transactions_shop_user
  ON point_transactions(shop_id, user_id);

ALTER TABLE daily_login_point_claims
  ADD COLUMN IF NOT EXISTS shop_id UUID NULL REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE daily_login_point_claims
  DROP CONSTRAINT IF EXISTS daily_login_point_claims_user_id_claim_date_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_login_claims_global
  ON daily_login_point_claims(user_id, claim_date) WHERE shop_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_daily_login_claims_shop
  ON daily_login_point_claims(shop_id, user_id, claim_date) WHERE shop_id IS NOT NULL;

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS shop_id UUID NULL REFERENCES shops(id) ON DELETE CASCADE;
ALTER TABLE referrals
  DROP CONSTRAINT IF EXISTS referrals_referred_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_global_referred
  ON referrals(referred_user_id) WHERE shop_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_shop_referred
  ON referrals(shop_id, referred_user_id) WHERE shop_id IS NOT NULL;

-- 4. Backfill (pre-multi-shop data belonged to the single/oldest shop) --------
UPDATE point_transactions
SET shop_id = (SELECT id FROM shops ORDER BY created_at ASC LIMIT 1)
WHERE shop_id IS NULL
  AND EXISTS (SELECT 1 FROM shops);

UPDATE daily_login_point_claims
SET shop_id = (SELECT id FROM shops ORDER BY created_at ASC LIMIT 1)
WHERE shop_id IS NULL
  AND EXISTS (SELECT 1 FROM shops);

UPDATE referrals
SET shop_id = (SELECT id FROM shops ORDER BY created_at ASC LIMIT 1)
WHERE shop_id IS NULL
  AND EXISTS (SELECT 1 FROM shops);

-- Move money, copy points into the oldest shop.
INSERT INTO user_shop_balances (user_id, shop_id, balance_usdt, balance_vnd, balance_point)
SELECT u.id,
       (SELECT id FROM shops ORDER BY created_at ASC LIMIT 1),
       u.balance_usdt,
       u.balance_vnd,
       u.balance_point
FROM users u
WHERE (u.balance_usdt <> 0 OR u.balance_vnd <> 0 OR u.balance_point <> 0)
  AND EXISTS (SELECT 1 FROM shops)
ON CONFLICT (user_id, shop_id) DO UPDATE
SET balance_usdt = user_shop_balances.balance_usdt + EXCLUDED.balance_usdt,
    balance_vnd = user_shop_balances.balance_vnd + EXCLUDED.balance_vnd,
    balance_point = user_shop_balances.balance_point + EXCLUDED.balance_point,
    updated_at = NOW();

UPDATE users
SET balance_usdt = 0,
    balance_vnd = 0,
    updated_at = NOW()
WHERE (balance_usdt <> 0 OR balance_vnd <> 0)
  AND EXISTS (SELECT 1 FROM shops);
