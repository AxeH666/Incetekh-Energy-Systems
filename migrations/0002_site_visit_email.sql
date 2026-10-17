-- Additive only: existing enquiries and their receipts remain intact.
-- Run only during a separately approved release, never on production from CI.
ALTER TABLE site_visit_leads ADD COLUMN email_enqueued INTEGER NOT NULL DEFAULT 0
  CHECK (email_enqueued IN (0, 1));
CREATE INDEX site_visit_email_unqueued ON site_visit_leads(created_at, id)
  WHERE email_enqueued = 0;

CREATE TABLE site_visit_email_outbox (
  lead_id TEXT PRIMARY KEY REFERENCES site_visit_leads(id),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'failed', 'uncertain')),
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  claim_token TEXT,
  provider_id TEXT,
  last_code TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX site_visit_email_due ON site_visit_email_outbox(next_attempt_at, lead_id)
  WHERE status = 'pending';
