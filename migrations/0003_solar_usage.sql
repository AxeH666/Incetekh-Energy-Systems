-- Additive and independent of enquiry rows; apply only after recovery verification.
CREATE TABLE IF NOT EXISTS solar_usage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  day TEXT NOT NULL,
  month TEXT NOT NULL,
  daily_count INTEGER NOT NULL CHECK (daily_count >= 0),
  monthly_count INTEGER NOT NULL CHECK (monthly_count >= 0)
);
