-- Per-shop payment credential redesign.
-- Adds ordering priority and collapses to a single row per (shop, method),
-- so on/off is expressed through status instead of stacking DISABLED rows.

ALTER TABLE shop_payment_credentials
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 0;

-- Deduplicate existing rows before enforcing a full unique constraint:
-- keep the most relevant row per (shop_id, payment_method) and delete the rest.
DELETE FROM shop_payment_credentials sc
USING (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY shop_id, payment_method
           ORDER BY (status = 'ACTIVE') DESC, updated_at DESC, id DESC
         ) AS rn
  FROM shop_payment_credentials
) dup
WHERE sc.id = dup.id AND dup.rn > 1;

DROP INDEX IF EXISTS ux_shop_payment_credentials_active_method;
CREATE UNIQUE INDEX IF NOT EXISTS ux_shop_payment_credentials_method
  ON shop_payment_credentials(shop_id, payment_method);
