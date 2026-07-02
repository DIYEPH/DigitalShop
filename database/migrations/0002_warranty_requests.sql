-- Warranty claims raised by buyers and resolved by the seller.
-- Resolution is intentionally lightweight: REPLACED attaches a fresh DELIVERED
-- stock row to the order, REFUNDED/REJECTED only record the seller decision
-- (money movement stays outside the system).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warranty_request_status_enum') THEN
    CREATE TYPE warranty_request_status_enum AS ENUM ('OPEN', 'REPLACED', 'REFUNDED', 'REJECTED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS warranty_requests (
  id SERIAL PRIMARY KEY,
  shop_id UUID NOT NULL DEFAULT digitalshop_default_shop_id() REFERENCES shops(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INT NULL REFERENCES order_items(id) ON DELETE SET NULL,
  user_id INT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  days_used INT NULL,
  status warranty_request_status_enum NOT NULL DEFAULT 'OPEN',
  resolution_note TEXT NULL,
  resolved_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_requests_shop_status ON warranty_requests(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_warranty_requests_order_id ON warranty_requests(order_id);
