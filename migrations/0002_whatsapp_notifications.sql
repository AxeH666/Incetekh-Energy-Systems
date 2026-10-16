-- Additive only: the accepted-lead insert path does not depend on these tables.
ALTER TABLE site_visit_leads ADD COLUMN whatsapp_queued_at INTEGER;
CREATE INDEX site_visit_leads_whatsapp_unqueued
ON site_visit_leads(created_at, id) WHERE whatsapp_queued_at IS NULL;

CREATE TABLE whatsapp_dispatch_control (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_hash TEXT NOT NULL,
  lease_id TEXT,
  next_dispatch_at INTEGER NOT NULL DEFAULT 0,
  reserved_attempt_id TEXT,
  budget_day TEXT NOT NULL DEFAULT '',
  attempts_today INTEGER NOT NULL DEFAULT 0 CHECK (attempts_today >= 0),
  halt_reason TEXT
);

CREATE TABLE whatsapp_outbox (
  lead_id TEXT PRIMARY KEY REFERENCES site_visit_leads(id),
  config_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK
    (state IN ('pending','retry','sending','accepted','sent','delivered','read','failed','uncertain')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  active_attempt_id TEXT,
  next_attempt_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX whatsapp_outbox_due ON whatsapp_outbox(state, next_attempt_at);

CREATE TABLE whatsapp_attempts (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES whatsapp_outbox(lead_id),
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 5),
  state TEXT NOT NULL CHECK
    (state IN ('sending','accepted','sent','delivered','read','retryable_failed','permanent_failed','uncertain')),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  retry_at INTEGER,
  message_id TEXT UNIQUE,
  acceptance_status TEXT,
  http_status INTEGER,
  error_code TEXT,
  accepted_at INTEGER,
  sent_at INTEGER,
  delivered_at INTEGER,
  read_at INTEGER,
  failed_at INTEGER,
  UNIQUE(lead_id, attempt_number)
);
CREATE INDEX whatsapp_attempts_stale ON whatsapp_attempts(state, started_at);

-- Persist normalized status facts before acknowledging a batch. Process bounded
-- chunks without losing larger provider batches or retaining inbound chat text.
CREATE TABLE whatsapp_status_events (
  id INTEGER PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES whatsapp_attempts(id),
  message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','delivered','read','failed')),
  occurred_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  error_code INTEGER NOT NULL DEFAULT 0,
  processed_at INTEGER,
  UNIQUE(attempt_id, message_id, status, occurred_at, error_code)
);
CREATE INDEX whatsapp_status_events_pending ON whatsapp_status_events(id)
WHERE processed_at IS NULL;
