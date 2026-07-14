-- Hey Zuly user facts / Wave prefs (Phase 4 memory stub)
-- Mid-term memory before Supabase/pgvector. No new vendor.
-- Run: wrangler d1 execute heyzuly-waitlist --local --file=./migrations/0004_create_user_facts.sql

CREATE TABLE IF NOT EXISTS user_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wave', 'inferred')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_user_facts_user_updated
  ON user_facts (user_id, updated_at DESC);
