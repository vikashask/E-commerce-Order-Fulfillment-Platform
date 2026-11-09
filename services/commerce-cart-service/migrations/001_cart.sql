CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  customer_id UUID,
  session_id VARCHAR(128),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  currency CHAR(3) DEFAULT 'INR',
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_carts_customer ON carts (customer_id) WHERE customer_id IS NOT NULL;

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(300) NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 999),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);
