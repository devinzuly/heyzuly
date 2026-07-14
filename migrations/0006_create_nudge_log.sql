-- Hey Zuly check-in nudge stub log (Phase 5d logic — no Resend/Twilio/Meta send)
-- Tracks who would be nudged; status stays stub until a vendor channel is wired.
-- Run: wrangler d1 execute heyzuly-waitlist --local --file=./migrations/0006_create_nudge_log.sql

CREATE TABLE IF NOT EXISTS nudge_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  planned_for TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'app'
    CHECK (channel IN ('app', 'email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'skipped', 'sent_stub')),
  skip_reason TEXT,
  body_preview TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nudge_log_user_planned
  ON nudge_log (user_id, planned_for DESC);

CREATE INDEX IF NOT EXISTS idx_nudge_log_planned_status
  ON nudge_log (planned_for, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nudge_log_user_day_channel
  ON nudge_log (user_id, planned_for, channel);
