/**
 * Phase 4 memory stub — D1 user_facts for Wave/pillar prefs and simple facts.
 * Long-term vector memory (Supabase/pgvector) stays vendor-blocked.
 */

export const PILLARS = [
  'meditation',
  'self-healing',
  'body',
  'life-guidance',
] as const;

export type PillarId = (typeof PILLARS)[number];

export type WaveStatus =
  | 'none'
  | 'starting'
  | 'active'
  | 'paused'
  | 'completed';

export interface WaveContext {
  pillar?: PillarId;
  label?: string;
  week?: number;
  status?: WaveStatus;
}

export interface MemoryFactInput {
  key: string;
  value: string;
}

export interface StoredFact {
  id: number;
  user_id: string;
  fact_key: string;
  fact_value: string;
  source: 'manual' | 'wave' | 'inferred';
  created_at: string;
  updated_at: string;
}

export interface UserPrefs {
  wave: WaveContext | null;
  facts: Array<{ key: string; value: string; source: string }>;
}

export const FACT_LIMIT = 24;

const WAVE_KEYS = {
  pillar: 'wave.pillar',
  label: 'wave.label',
  week: 'wave.week',
  status: 'wave.status',
} as const;

const PILLAR_PRIMARY = 'pillar.primary';

const PILLAR_LABELS: Record<PillarId, string> = {
  meditation: 'Meditation',
  'self-healing': 'Self-healing',
  body: 'Body',
  'life-guidance': 'Life guidance',
};

export function isPillarId(value: unknown): value is PillarId {
  return typeof value === 'string' && (PILLARS as readonly string[]).includes(value);
}

export function defaultWaveLabel(pillar: PillarId): string {
  return `First Wave — ${PILLAR_LABELS[pillar]}`;
}

export function parseWaveContext(raw: unknown): WaveContext | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;

  const pillar = isPillarId(obj.pillar) ? obj.pillar : undefined;
  const label =
    typeof obj.label === 'string' && obj.label.trim()
      ? obj.label.trim().slice(0, 120)
      : undefined;
  const week =
    typeof obj.week === 'number' && Number.isFinite(obj.week)
      ? Math.min(Math.max(1, Math.floor(obj.week)), 8)
      : undefined;
  const status =
    obj.status === 'none' ||
    obj.status === 'starting' ||
    obj.status === 'active' ||
    obj.status === 'paused' ||
    obj.status === 'completed'
      ? obj.status
      : undefined;

  if (!pillar && !label && week == null && !status) {
    return undefined;
  }

  return { pillar, label, week, status };
}

export function parseMemoryFacts(raw: unknown): MemoryFactInput[] | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const facts = obj.facts;
  if (!Array.isArray(facts)) return undefined;

  const out: MemoryFactInput[] = [];
  for (const entry of facts) {
    if (!entry || typeof entry !== 'object') continue;
    const key = (entry as MemoryFactInput).key;
    const value = (entry as MemoryFactInput).value;
    if (typeof key !== 'string' || !key.trim()) continue;
    if (typeof value !== 'string' || !value.trim()) continue;
    const k = key.trim().slice(0, 64);
    const v = value.trim().slice(0, 500);
    // Reserved wave.* keys go through wave upsert, not free-form memory
    if (k.startsWith('wave.')) continue;
    out.push({ key: k, value: v });
    if (out.length >= 20) break;
  }
  return out.length ? out : undefined;
}

export async function upsertFact(
  db: D1Database,
  userId: string,
  key: string,
  value: string,
  source: 'manual' | 'wave' | 'inferred' = 'manual'
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_facts (user_id, fact_key, fact_value, source, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, fact_key) DO UPDATE SET
         fact_value = excluded.fact_value,
         source = excluded.source,
         updated_at = datetime('now')`
    )
    .bind(userId, key, value, source)
    .run();
}

export async function upsertWavePrefs(
  db: D1Database,
  userId: string,
  wave: WaveContext
): Promise<WaveContext> {
  const pillar = wave.pillar;
  const status = wave.status ?? (pillar ? 'starting' : 'none');
  const week = wave.week ?? (status === 'none' ? undefined : 1);
  const label =
    wave.label ??
    (pillar ? defaultWaveLabel(pillar) : status === 'none' ? undefined : undefined);

  if (pillar) {
    await upsertFact(db, userId, WAVE_KEYS.pillar, pillar, 'wave');
    await upsertFact(db, userId, PILLAR_PRIMARY, pillar, 'wave');
  }
  if (label) {
    await upsertFact(db, userId, WAVE_KEYS.label, label, 'wave');
  }
  if (week != null) {
    await upsertFact(db, userId, WAVE_KEYS.week, String(week), 'wave');
  }
  await upsertFact(db, userId, WAVE_KEYS.status, status, 'wave');

  return {
    pillar,
    label,
    week,
    status,
  };
}

export async function upsertMemoryFacts(
  db: D1Database,
  userId: string,
  facts: MemoryFactInput[],
  source: 'manual' | 'inferred' = 'manual'
): Promise<void> {
  for (const fact of facts) {
    await upsertFact(db, userId, fact.key, fact.value, source);
  }
}

export async function listUserFacts(
  db: D1Database,
  userId: string,
  limit = FACT_LIMIT
): Promise<StoredFact[]> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);
  const { results } = await db
    .prepare(
      `SELECT id, user_id, fact_key, fact_value, source, created_at, updated_at
       FROM user_facts
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC
       LIMIT ?`
    )
    .bind(userId, safeLimit)
    .all<StoredFact>();
  return results ?? [];
}

export function waveFromFacts(facts: StoredFact[]): WaveContext | null {
  const map = new Map(facts.map((f) => [f.fact_key, f.fact_value]));
  const pillarRaw = map.get(WAVE_KEYS.pillar) ?? map.get(PILLAR_PRIMARY);
  const pillar = isPillarId(pillarRaw) ? pillarRaw : undefined;
  const label = map.get(WAVE_KEYS.label);
  const weekRaw = map.get(WAVE_KEYS.week);
  const week = weekRaw && /^\d+$/.test(weekRaw) ? Number(weekRaw) : undefined;
  const statusRaw = map.get(WAVE_KEYS.status);
  const status =
    statusRaw === 'none' ||
    statusRaw === 'starting' ||
    statusRaw === 'active' ||
    statusRaw === 'paused' ||
    statusRaw === 'completed'
      ? statusRaw
      : undefined;

  if (!pillar && !label && week == null && !status) {
    return null;
  }
  return { pillar, label, week, status };
}

export async function loadUserPrefs(
  db: D1Database,
  userId: string
): Promise<UserPrefs> {
  const rows = await listUserFacts(db, userId);
  const wave = waveFromFacts(rows);
  const facts = rows
    .filter((r) => !r.fact_key.startsWith('wave.') && r.fact_key !== PILLAR_PRIMARY)
    .map((r) => ({
      key: r.fact_key,
      value: r.fact_value,
      source: r.source,
    }));

  // Always surface primary pillar in facts list for UI if set
  const primary = rows.find((r) => r.fact_key === PILLAR_PRIMARY);
  if (primary && !facts.some((f) => f.key === PILLAR_PRIMARY)) {
    facts.unshift({
      key: primary.fact_key,
      value: primary.fact_value,
      source: primary.source,
    });
  }

  return { wave, facts };
}

/** Compact block for system / stub injection. */
export function formatMemoryInjection(
  wave: WaveContext | null | undefined,
  facts: Array<{ key: string; value: string }>
): string {
  const lines: string[] = [];

  if (wave?.pillar || wave?.label || wave?.status) {
    const parts: string[] = [];
    if (wave.label) parts.push(wave.label);
    else if (wave.pillar) parts.push(defaultWaveLabel(wave.pillar));
    if (wave.pillar) parts.push(`pillar=${wave.pillar}`);
    if (wave.week != null) parts.push(`week ${wave.week}`);
    if (wave.status) parts.push(`status=${wave.status}`);
    lines.push(`- Wave: ${parts.join(' · ')}`);
  }

  for (const fact of facts) {
    if (fact.key.startsWith('wave.')) continue;
    if (fact.key === 'onboarding.complete') continue;
    lines.push(`- ${fact.key}: ${fact.value}`);
  }

  if (!lines.length) return '';

  return (
    `## User memory (known facts — do not invent beyond these)\n` +
    lines.join('\n')
  );
}
