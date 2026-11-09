CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name VARCHAR(150) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  price_list_id UUID NOT NULL REFERENCES price_lists(id),
  variant_id UUID NOT NULL,
  unit_amount_minor BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_prices_variant ON product_prices (variant_id, price_list_id);

CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code VARCHAR(100),
  name VARCHAR(150) NOT NULL,
  promotion_type VARCHAR(30) NOT NULL DEFAULT 'percentage',
  conditions JSONB NOT NULL DEFAULT '{}',
  benefit JSONB NOT NULL DEFAULT '{}',
  usage_limit INTEGER,
  per_customer_limit INTEGER,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  customer_id UUID,
  order_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'redeemed',
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  customer_id UUID,
  cart_id UUID NOT NULL,
  cart_version INTEGER NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  discount_minor BIGINT NOT NULL DEFAULT 0,
  shipping_minor BIGINT DEFAULT 0,
  tax_minor BIGINT DEFAULT 0,
  total_minor BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
