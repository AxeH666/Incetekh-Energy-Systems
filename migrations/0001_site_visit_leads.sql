CREATE TABLE site_visit_leads (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  location TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('3kw', '5kw', '7kw', '10plus', 'water-heater', 'advice')),
  language TEXT NOT NULL CHECK (language IN ('en', 'te', 'hi', 'ta', 'ml', 'kn')),
  payload_hash TEXT NOT NULL,
  privacy_notice_version TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (notification_status = 'not_configured')
);
CREATE INDEX site_visit_leads_created ON site_visit_leads(created_at, id);
