-- Extend shop_members to also hold shop customers (buyers), keeping a single
-- membership table instead of a separate customers table:
--   OWNER/MANAGER/STAFF = shop staff, CUSTOMER = buyer (auto-added on first order).
-- status lets a shop ban one of its customers without affecting other shops.
--
-- NOTE: the new enum value cannot be used in the same transaction that adds it,
-- so the CUSTOMER backfill lives in migration 0004.

ALTER TYPE shop_member_role_enum ADD VALUE IF NOT EXISTS 'CUSTOMER';

ALTER TABLE shop_members
  ADD COLUMN IF NOT EXISTS status user_status_enum NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_shop_members_shop_role ON shop_members(shop_id, role);
