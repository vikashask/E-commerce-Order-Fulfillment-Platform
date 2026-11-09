CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO warehouses (id, code, name) VALUES ('00000000-0000-0000-0000-000000000001', 'WH-01', 'Main Warehouse');

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  variant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  on_hand_quantity INTEGER NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  safety_stock_quantity INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, variant_id)
);

CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status VARCHAR(30) NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES inventory_reservations(id),
  variant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  warehouse_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reason VARCHAR(200),
  actor_id UUID,
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
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inbox_messages (
  consumer_name VARCHAR(150) NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  PRIMARY KEY (consumer_name, event_id)
);
