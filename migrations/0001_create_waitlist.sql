-- Hey Zuly waitlist (Phase 2)
-- Run: wrangler d1 execute heyzuly-waitlist --local --file=./migrations/0001_create_waitlist.sql

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'landing',
  utm_json TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_start)
);
