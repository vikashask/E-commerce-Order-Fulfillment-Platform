CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE fulfillment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_id UUID NOT NULL,
  warehouse_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  status VARCHAR(30) NOT NULL DEFAULT 'not_ready',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fulfillment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders(id),
  order_item_id UUID,
  variant_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_picked INTEGER NOT NULL DEFAULT 0,
  quantity_packed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  order_id UUID NOT NULL,
  fulfillment_order_id UUID REFERENCES fulfillment_orders(id),
  carrier VARCHAR(100) NOT NULL DEFAULT 'simulator',
  service_level VARCHAR(100) NOT NULL DEFAULT 'standard',
  tracking_number VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  event_type VARCHAR(100) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
