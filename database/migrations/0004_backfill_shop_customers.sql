-- Backfill: everyone who already ordered from a shop becomes its CUSTOMER.
-- Staff rows are left untouched thanks to ON CONFLICT DO NOTHING.

INSERT INTO shop_members (shop_id, user_id, role)
SELECT DISTINCT o.shop_id, o.user_id, 'CUSTOMER'::shop_member_role_enum
FROM orders o
ON CONFLICT (shop_id, user_id) DO NOTHING;
