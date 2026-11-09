CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_number VARCHAR(40) NOT NULL,
  customer_id UUID,
  checkout_idempotency_key VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
  fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'not_ready',
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  discount_minor BIGINT NOT NULL DEFAULT 0,
  shipping_minor BIGINT NOT NULL DEFAULT 0,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  total_minor BIGINT NOT NULL DEFAULT 0,
  shipping_address_snapshot JSONB,
  price_quote_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_orders_number ON orders (store_id, order_number);
CREATE UNIQUE INDEX idx_orders_idempotency ON orders (store_id, checkout_idempotency_key) WHERE checkout_idempotency_key IS NOT NULL;
CREATE INDEX idx_orders_customer ON orders (store_id, customer_id, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  variant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  product_name_snapshot VARCHAR(300) NOT NULL,
  variant_snapshot JSONB,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor BIGINT NOT NULL,
  discount_minor BIGINT NOT NULL DEFAULT 0,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  line_total_minor BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_sagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  saga_type VARCHAR(100) NOT NULL DEFAULT 'checkout',
  state VARCHAR(50) NOT NULL DEFAULT 'started',
  current_step VARCHAR(100) NOT NULL DEFAULT 'inventory_reservation',
  version INTEGER NOT NULL DEFAULT 1,
  correlation_id VARCHAR(150),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_error_code VARCHAR(100),
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sagas_state ON order_sagas (state, next_action_at);

CREATE TABLE order_saga_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL REFERENCES order_sagas(id),
  step_name VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  request_reference VARCHAR(255),
  result_reference VARCHAR(255),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_code VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  reason_code VARCHAR(100),
  actor_type VARCHAR(30) NOT NULL DEFAULT 'system',
  actor_id UUID,
  correlation_id VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(200) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  correlation_id VARCHAR(150),
  causation_id VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code VARCHAR(100),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inbox_messages (
  consumer_name VARCHAR(150) NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  error_code VARCHAR(100),
  PRIMARY KEY (consumer_name, event_id)
);
