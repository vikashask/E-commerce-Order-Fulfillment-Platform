CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  event_id UUID,
  recipient_id UUID,
  channel VARCHAR(30) NOT NULL DEFAULT 'email',
  template_key VARCHAR(100) NOT NULL,
  template_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_job_id UUID NOT NULL REFERENCES notification_jobs(id),
  provider VARCHAR(100) NOT NULL DEFAULT 'console',
  provider_message_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_code VARCHAR(100),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inbox_messages (
  consumer_name VARCHAR(150) NOT NULL,
  event_id UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  PRIMARY KEY (consumer_name, event_id)
);
