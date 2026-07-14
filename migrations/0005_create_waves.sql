-- Hey Zuly Waves + day plans (Phase 5 stub / roadmap #8)
-- First Wave row + canned "build today" JSON. No LLM / vendor.
-- Run: wrangler d1 execute heyzuly-waitlist --local --file=./migrations/0005_create_waves.sql

CREATE TABLE IF NOT EXISTS waves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  pillars TEXT NOT NULL,
  primary_pillar TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused')),
  week INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waves_user_status
  ON waves (user_id, status);

CREATE INDEX IF NOT EXISTS idx_waves_user_started
  ON waves (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS day_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  wave_id INTEGER NOT NULL,
  plan_date TEXT NOT NULL,
  items_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'skipped')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, plan_date),
  FOREIGN KEY (wave_id) REFERENCES waves(id)
);

CREATE INDEX IF NOT EXISTS idx_day_plans_wave_date
  ON day_plans (wave_id, plan_date);

CREATE INDEX IF NOT EXISTS idx_day_plans_user_date
  ON day_plans (user_id, plan_date DESC);
