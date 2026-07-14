-- Hey Zuly users + invite stub (Phase 3)
-- Run: wrangler d1 execute heyzuly-waitlist --local --file=./migrations/0002_create_users.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_provider_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  onboarding_complete INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_id ON users(auth_provider_id);

-- Manual invite list (stub for waitlist → early access)
CREATE TABLE IF NOT EXISTS invites (
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  invited_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
