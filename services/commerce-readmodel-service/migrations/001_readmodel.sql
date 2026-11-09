CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE customer_order_summary (
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  customer_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_number VARCHAR(40) NOT NULL,
  order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'not_ready',
  total_minor BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_version BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (store_id, order_id)
);
CREATE INDEX idx_cos_customer ON customer_order_summary (store_id, customer_id, placed_at DESC);

CREATE TABLE operations_order_view (
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_id UUID NOT NULL,
  order_number VARCHAR(40) NOT NULL,
  customer_id UUID,
  order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'not_ready',
  total_minor BIGINT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_version BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (store_id, order_id)
);

CREATE TABLE inbox_messages (
  consumer_name VARCHAR(150) NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  PRIMARY KEY (consumer_name, event_id)
);
