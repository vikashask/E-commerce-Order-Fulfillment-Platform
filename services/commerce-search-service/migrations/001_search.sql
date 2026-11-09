CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE product_search_documents (
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID,
  attributes JSONB DEFAULT '{}',
  publication_status VARCHAR(30) NOT NULL DEFAULT 'published',
  search_vector tsvector,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_version BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (store_id, product_id)
);
CREATE INDEX idx_search_fts ON product_search_documents USING gin(search_vector);

CREATE TABLE inbox_messages (
  consumer_name VARCHAR(150) NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  PRIMARY KEY (consumer_name, event_id)
);
