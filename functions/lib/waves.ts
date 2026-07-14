/**
 * Phase 5 stub — D1 waves / day_plans + canned “build today” templates.
 * No LLM. Branches on soft-launch survey facts when present.
 * Shame-free growth copy; Waves bend.
 */

import {
  defaultWaveLabel,
  isPillarId,
  listUserFacts,
  upsertWavePrefs,
  type PillarId,
  type StoredFact,
} from './memory';

export type WaveRowStatus = 'active' | 'completed' | 'paused';
export type DayPlanStatus = 'open' | 'done' | 'skipped';

export interface DayPlanItem {
  id: string;
  text: string;
  pillar: PillarId;
  done: boolean;
}

/** Soft-launch survey + rhythm constraints for canned day plans. */
export interface PlanFactHints {
  seasonLabel?: string;
  hardWindow?: string;
  healTheme?: string;
  healMode?: string;
  healEnergy?: string;
}

export interface WaveRecord {
  id: number;
  user_id: string;
  pillars: PillarId[];
  primary_pillar: PillarId;
  label: string;
  status: WaveRowStatus;
  week: number;
  started_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayPlanRecord {
  id: number;
  user_id: string;
  wave_id: number;
  plan_date: string;
  items: DayPlanItem[];
  status: DayPlanStatus;
  created_at: string;
  updated_at: string;
}

interface WaveRow {
  id: number;
  user_id: string;
  pillars: string;
  primary_pillar: string;
  label: string;
  status: string;
  week: number;
  started_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DayPlanRow {
  id: number;
  user_id: string;
  wave_id: number;
  plan_date: string;
  items_json: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Tiny, doable actions — growth season, no grind / streak shame. */
const TEMPLATES: Record<PillarId, string[]> = {
  meditation: [
    'Three slow breaths before you open anything important.',
    'Sit still for two minutes — no fixing, just noticing.',
    'Name one sound or feeling without judging it.',
  ],
  'self-healing': [
    'Write one true sentence about how today feels.',
    'Catch one harsh thought and rephrase it softer — same honesty.',
    'Name one thing that went okay, even if the rest felt messy.',
  ],
  body: [
    'Stretch for one minute — shoulders or hips, whatever’s tight.',
    'Take a short walk or stand and move gently for three minutes.',
    'Drink a glass of water like it counts as care, not a chore.',
  ],
  'life-guidance': [
    'Pick one small next step for something that’s weighing on you.',
    'Send a kind note (or thank-you) to someone who helps you show up.',
    'Clear one tiny clutter pile — five minutes, then stop.',
  ],
};

/** heal.mode = Write privately */
const HEAL_WRITE: string[] = [
  'Jot one private sentence about how today feels — no fixing required.',
  'Write three bullets: what weighed on you, what helped, what can wait.',
  'Close a small loop on paper: one worry, one kinder next line, done.',
];

/** heal.mode = Talk it out with Zuly */
const HEAL_TALK: string[] = [
  'Open chat with Zuly and name one thing weighing on you — short is fine.',
  'Tell Zuly one harsh thought out loud (or typed) and ask for a softer take.',
  'Check in with Zuly for two minutes: what’s true right now, not the whole story.',
];

/** heal.mode = Small actions first, words later */
const HEAL_ACTION: string[] = [
  'Move one tiny object that represents relief — water glass, shoes by the door, a text reply.',
  'Do one body reset (shoulders down, jaw unclench) before you explain anything.',
  'Pick one two-minute task that makes tomorrow 5% easier — then stop.',
];

const HEAL_THEME_LINES: Array<{ match: RegExp; line: string }> = [
  {
    match: /rumination|replaying/i,
    line: 'Catch one replay once, note it privately, then gently close the notebook.',
  },
  {
    match: /self-criticism/i,
    line: 'Rewrite one harsh self-line softer — same honesty, less sting.',
  },
  {
    match: /overwhelm/i,
    line: 'Name the next smallest step only — park the rest for later without apology.',
  },
  {
    match: /low mood/i,
    line: 'Do one gentle show-up: water, daylight, or a two-minute stretch — counts as care.',
  },
  {
    match: /conflict/i,
    line: 'Write what you wish you’d said, then decide later if anything needs saying.',
  },
  {
    match: /numb|flat/i,
    line: 'Name one sensation or color in the room — no pressure to feel more than that.',
  },
];

const WAVE_DURATION_WEEKS = 4;

export function planHintsFromFacts(
  facts: Array<StoredFact | { fact_key: string; fact_value: string } | { key: string; value: string }>
): PlanFactHints {
  const map = new Map<string, string>();
  for (const row of facts) {
    if ('fact_key' in row && 'fact_value' in row) {
      map.set(row.fact_key, row.fact_value);
    } else if ('key' in row && 'value' in row) {
      map.set(row.key, row.value);
    }
  }
  const hints: PlanFactHints = {};
  const season = map.get('season.label')?.trim();
  const hard = map.get('rhythm.hard_window')?.trim();
  const theme = map.get('heal.theme')?.trim();
  const mode = map.get('heal.mode')?.trim();
  const energy = map.get('heal.energy')?.trim();
  if (season) hints.seasonLabel = season;
  if (hard) hints.hardWindow = hard;
  if (theme) hints.healTheme = theme;
  if (mode) hints.healMode = mode;
  if (energy) hints.healEnergy = energy;
  return hints;
}

function isLowEnergy(energy: string | undefined): boolean {
  if (!energy) return false;
  return /^(2\s*min|only when)/i.test(energy.trim());
}

function isHighEnergy(energy: string | undefined): boolean {
  if (!energy) return false;
  return /^15\+/.test(energy.trim());
}

/** Prefer slots outside the user’s hardest window — shame-free, not rigid. */
function timingCue(hardWindow: string | undefined): string {
  if (!hardWindow || /^it depends/i.test(hardWindow)) return '';
  if (/^mornings/i.test(hardWindow)) {
    return 'Skip the morning hustle — try this midday or evening: ';
  }
  if (/^midday/i.test(hardWindow)) {
    return 'Keep midday light — morning or evening is fine: ';
  }
  if (/^evenings/i.test(hardWindow)) {
    return 'Evening-friendly (when energy dips, keep it tiny): ';
  }
  if (/late\s*night/i.test(hardWindow)) {
    return 'Late-night friendly — soft landing, not a productivity spike: ';
  }
  return '';
}

function themeLine(theme: string | undefined, seed: number): string | null {
  if (!theme) return null;
  const hits = HEAL_THEME_LINES.filter((t) => t.match.test(theme));
  if (!hits.length) return null;
  return hits[Math.abs(seed) % hits.length]!.line;
}

function healModePool(mode: string | undefined): string[] {
  if (!mode) return TEMPLATES['self-healing'];
  if (/write privately/i.test(mode)) return HEAL_WRITE;
  if (/talk it out/i.test(mode)) return HEAL_TALK;
  if (/small actions first/i.test(mode)) return HEAL_ACTION;
  if (/^mix/i.test(mode)) {
    // Prefer one write + one talk when Mix; builders pick across pools.
    return [...HEAL_WRITE, ...HEAL_TALK];
  }
  return TEMPLATES['self-healing'];
}

function applyTiming(text: string, hardWindow: string | undefined): string {
  const cue = timingCue(hardWindow);
  if (!cue) return text;
  // Avoid double-prefix if regenerate rotates the same cue.
  if (text.startsWith(cue)) return text;
  const combined = `${cue}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  return combined.slice(0, 200);
}

function seasonPrefix(season: string | undefined): string {
  if (!season || /mix\s*\/\s*unsure/i.test(season)) return '';
  if (/healing something heavy/i.test(season)) {
    return 'In a heavy-healing season — keep this gentle: ';
  }
  if (/stretching at work/i.test(season)) {
    return 'Work-stretch season — protect one small pocket: ';
  }
  if (/getting my body back/i.test(season)) {
    return 'Body-return season — no punishment workouts: ';
  }
  if (/straightening life/i.test(season)) {
    return 'Life-straightening season — one clear thread: ';
  }
  return '';
}

export function todayDateUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addWeeksIso(startedAt: string, weeks: number): string {
  const d = new Date(startedAt.includes('T') ? startedAt : `${startedAt}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + weeks * 7);
    return fallback.toISOString().slice(0, 10);
  }
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function parsePillarsJson(raw: string): PillarId[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPillarId);
  } catch {
    return [];
  }
}

function parseItemsJson(raw: string): DayPlanItem[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DayPlanItem[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const obj = entry as Record<string, unknown>;
      const id = typeof obj.id === 'string' ? obj.id : '';
      const text = typeof obj.text === 'string' ? obj.text.trim() : '';
      const pillar = isPillarId(obj.pillar) ? obj.pillar : null;
      if (!id || !text || !pillar) continue;
      out.push({
        id: id.slice(0, 32),
        text: text.slice(0, 200),
        pillar,
        done: obj.done === true,
      });
      if (out.length >= 5) break;
    }
    return out;
  } catch {
    return [];
  }
}

function rowToWave(row: WaveRow): WaveRecord {
  const pillars = parsePillarsJson(row.pillars);
  const primary = isPillarId(row.primary_pillar)
    ? row.primary_pillar
    : pillars[0] ?? 'self-healing';
  const status: WaveRowStatus =
    row.status === 'completed' || row.status === 'paused' ? row.status : 'active';
  return {
    id: row.id,
    user_id: row.user_id,
    pillars: pillars.length ? pillars : [primary],
    primary_pillar: primary,
    label: row.label,
    status,
    week: Math.min(Math.max(1, Number(row.week) || 1), 8),
    started_at: row.started_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToDayPlan(row: DayPlanRow): DayPlanRecord {
  const status: DayPlanStatus =
    row.status === 'done' || row.status === 'skipped' ? row.status : 'open';
  return {
    id: row.id,
    user_id: row.user_id,
    wave_id: row.wave_id,
    plan_date: row.plan_date,
    items: parseItemsJson(row.items_json),
    status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function poolForPillar(
  pillar: PillarId,
  hints: PlanFactHints
): string[] {
  if (pillar === 'self-healing') {
    return healModePool(hints.healMode);
  }
  return TEMPLATES[pillar];
}

/**
 * Canned day-plan items from pillar prefs + soft-launch survey facts.
 * No Anthropic. Low energy → fewer/shorter; hard_window → timing cue; heal.mode → action style.
 */
export function buildTodayItems(
  primary: PillarId,
  secondary?: PillarId | null,
  seed = 0,
  hints: PlanFactHints = {}
): DayPlanItem[] {
  const primaryPool = poolForPillar(primary, hints);
  const secondaryPool =
    secondary && secondary !== primary ? poolForPillar(secondary, hints) : null;

  const pick = (pool: string[], offset: number): string =>
    pool[Math.abs(offset) % pool.length]!;

  const low = isLowEnergy(hints.healEnergy);
  const high = isHighEnergy(hints.healEnergy);
  // Default 3 (pre-survey). Low energy → 1–2; mid (5–10) → 2; high → 3 tiny max.
  let targetCount = 3;
  if (low) targetCount = secondaryPool ? 2 : 1;
  else if (hints.healEnergy && !high) targetCount = secondaryPool ? 3 : 2;

  const drafts: Array<{ text: string; pillar: PillarId }> = [];

  // Theme-aware lead when Self-healing is in play.
  if (primary === 'self-healing' || secondary === 'self-healing') {
    const themed = themeLine(hints.healTheme, seed);
    if (themed) {
      drafts.push({
        text: themed,
        pillar: primary === 'self-healing' ? primary : 'self-healing',
      });
    }
  }

  // Mix mode: prefer one write + one talk when self-healing is primary.
  if (
    primary === 'self-healing' &&
    hints.healMode &&
    /^mix/i.test(hints.healMode)
  ) {
    drafts.push({ text: pick(HEAL_WRITE, seed), pillar: primary });
    drafts.push({ text: pick(HEAL_TALK, seed + 1), pillar: primary });
  } else {
    drafts.push({ text: pick(primaryPool, seed), pillar: primary });
    if (!low) {
      drafts.push({ text: pick(primaryPool, seed + 1), pillar: primary });
    }
  }

  if (secondaryPool && drafts.length < targetCount) {
    drafts.push({
      text: pick(secondaryPool, seed + 2),
      pillar: secondary!,
    });
  }

  // Dedupe by text, cap count.
  const seen = new Set<string>();
  const items: DayPlanItem[] = [];
  for (const draft of drafts) {
    const key = draft.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let text = draft.text;
    // Season framing only on the first item — light, not brandy.
    if (items.length === 0) {
      const prefix = seasonPrefix(hints.seasonLabel);
      if (prefix) {
        text = `${prefix}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
      }
    }
    text = applyTiming(text, hints.hardWindow);
    if (low && text.length > 120) {
      text = `${text.slice(0, 117).trimEnd()}…`;
    }
    items.push({
      id: `t${items.length + 1}`,
      text: text.slice(0, 200),
      pillar: draft.pillar,
      done: false,
    });
    if (items.length >= targetCount) break;
  }

  // Guarantee at least one item.
  if (!items.length) {
    items.push({
      id: 't1',
      text: applyTiming(pick(TEMPLATES[primary], seed), hints.hardWindow).slice(
        0,
        200
      ),
      pillar: primary,
      done: false,
    });
  }

  return items;
}

function daySeed(date: string): number {
  let n = 0;
  for (let i = 0; i < date.length; i++) n = (n + date.charCodeAt(i) * (i + 1)) % 997;
  return n;
}

function planStatusFromItems(items: DayPlanItem[]): DayPlanStatus {
  if (!items.length) return 'open';
  if (items.every((item) => item.done)) return 'done';
  return 'open';
}

export async function getActiveWave(
  db: D1Database,
  userId: string
): Promise<WaveRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, pillars, primary_pillar, label, status, week,
              started_at, ends_at, created_at, updated_at
       FROM waves
       WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC, id DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<WaveRow>();
  return row ? rowToWave(row) : null;
}

export async function getDayPlanForDate(
  db: D1Database,
  userId: string,
  planDate: string
): Promise<DayPlanRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, wave_id, plan_date, items_json, status, created_at, updated_at
       FROM day_plans
       WHERE user_id = ? AND plan_date = ?
       LIMIT 1`
    )
    .bind(userId, planDate)
    .first<DayPlanRow>();
  return row ? rowToDayPlan(row) : null;
}

async function insertWave(
  db: D1Database,
  userId: string,
  pillars: PillarId[],
  primary: PillarId,
  label: string
): Promise<WaveRecord> {
  const startedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const endsAt = addWeeksIso(startedAt, WAVE_DURATION_WEEKS);
  const result = await db
    .prepare(
      `INSERT INTO waves (
         user_id, pillars, primary_pillar, label, status, week, started_at, ends_at, updated_at
       ) VALUES (?, ?, ?, ?, 'active', 1, ?, ?, datetime('now'))`
    )
    .bind(userId, JSON.stringify(pillars), primary, label, startedAt, endsAt)
    .run();

  const id = Number(result.meta.last_row_id);
  const row = await db
    .prepare(
      `SELECT id, user_id, pillars, primary_pillar, label, status, week,
              started_at, ends_at, created_at, updated_at
       FROM waves WHERE id = ? AND user_id = ?`
    )
    .bind(id, userId)
    .first<WaveRow>();

  if (!row) {
    throw new Error('wave_insert_failed');
  }
  return rowToWave(row);
}

async function upsertDayPlan(
  db: D1Database,
  userId: string,
  waveId: number,
  planDate: string,
  items: DayPlanItem[],
  regenerate: boolean
): Promise<DayPlanRecord> {
  const existing = await getDayPlanForDate(db, userId, planDate);
  const status = planStatusFromItems(items);
  const itemsJson = JSON.stringify(items);

  if (existing && !regenerate) {
    await db
      .prepare(
        `UPDATE day_plans
         SET items_json = ?, status = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .bind(itemsJson, status, existing.id, userId)
      .run();
    return {
      ...existing,
      items,
      status,
      updated_at: new Date().toISOString(),
    };
  }

  if (existing && regenerate) {
    await db
      .prepare(
        `UPDATE day_plans
         SET wave_id = ?, items_json = ?, status = ?, updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`
      )
      .bind(waveId, itemsJson, status, existing.id, userId)
      .run();
    return {
      ...existing,
      wave_id: waveId,
      items,
      status,
      updated_at: new Date().toISOString(),
    };
  }

  const insert = await db
    .prepare(
      `INSERT INTO day_plans (user_id, wave_id, plan_date, items_json, status, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(userId, waveId, planDate, itemsJson, status)
    .run();

  const id = Number(insert.meta.last_row_id);
  const row = await db
    .prepare(
      `SELECT id, user_id, wave_id, plan_date, items_json, status, created_at, updated_at
       FROM day_plans WHERE id = ? AND user_id = ?`
    )
    .bind(id, userId)
    .first<DayPlanRow>();

  if (!row) {
    throw new Error('day_plan_insert_failed');
  }
  return rowToDayPlan(row);
}

async function pillarsFromPrefs(
  db: D1Database,
  userId: string
): Promise<{ primary: PillarId; pillars: PillarId[] } | null> {
  const rows = await listUserFacts(db, userId);
  const map = new Map(rows.map((r) => [r.fact_key, r.fact_value]));
  const primaryRaw = map.get('wave.pillar') ?? map.get('pillar.primary');
  if (!isPillarId(primaryRaw)) return null;
  const pillars: PillarId[] = [primaryRaw];
  const secondary = map.get('pillar.secondary');
  if (isPillarId(secondary) && secondary !== primaryRaw) {
    pillars.push(secondary);
  }
  return { primary: primaryRaw, pillars };
}

/**
 * Create or reuse the user’s active First Wave from onboarding prefs.
 * Also syncs user_facts wave.* to status=active and ensures today’s plan.
 */
export async function ensureFirstWave(
  db: D1Database,
  userId: string,
  opts?: {
    pillars?: PillarId[];
    generateToday?: boolean;
  }
): Promise<{ wave: WaveRecord; today: DayPlanRecord | null; created: boolean }> {
  const existing = await getActiveWave(db, userId);
  if (existing) {
    let today: DayPlanRecord | null = null;
    if (opts?.generateToday !== false) {
      today = await ensureTodayPlan(db, userId, existing, false);
    } else {
      today = await getDayPlanForDate(db, userId, todayDateUtc());
    }
    await syncWaveFacts(db, userId, existing);
    return { wave: existing, today, created: false };
  }

  let pillars = opts?.pillars?.filter(isPillarId) ?? [];
  if (!pillars.length) {
    const fromPrefs = await pillarsFromPrefs(db, userId);
    if (!fromPrefs) {
      throw new Error('wave_prefs_missing');
    }
    pillars = fromPrefs.pillars;
  }

  const primary = pillars[0]!;
  const label = defaultWaveLabel(primary);
  const wave = await insertWave(db, userId, pillars, primary, label);
  await syncWaveFacts(db, userId, wave);

  let today: DayPlanRecord | null = null;
  if (opts?.generateToday !== false) {
    today = await ensureTodayPlan(db, userId, wave, true);
  }

  return { wave, today, created: true };
}

async function syncWaveFacts(
  db: D1Database,
  userId: string,
  wave: WaveRecord
): Promise<void> {
  await upsertWavePrefs(db, userId, {
    pillar: wave.primary_pillar,
    label: wave.label,
    week: wave.week,
    status: 'active',
  });
}

export async function ensureTodayPlan(
  db: D1Database,
  userId: string,
  wave: WaveRecord,
  regenerate: boolean
): Promise<DayPlanRecord> {
  const planDate = todayDateUtc();
  const existing = await getDayPlanForDate(db, userId, planDate);
  if (existing && !regenerate) {
    return existing;
  }

  const factRows = await listUserFacts(db, userId);
  const hints = planHintsFromFacts(factRows);
  const secondary = wave.pillars.find((p) => p !== wave.primary_pillar) ?? null;
  const items = buildTodayItems(
    wave.primary_pillar,
    secondary,
    daySeed(planDate) + wave.id,
    hints
  );
  return upsertDayPlan(db, userId, wave.id, planDate, items, regenerate);
}

export async function markDayPlanItem(
  db: D1Database,
  userId: string,
  itemId: string,
  done: boolean
): Promise<DayPlanRecord | null> {
  const planDate = todayDateUtc();
  const plan = await getDayPlanForDate(db, userId, planDate);
  if (!plan) return null;

  const items = plan.items.map((item) =>
    item.id === itemId ? { ...item, done } : item
  );
  if (!items.some((item) => item.id === itemId)) {
    return null;
  }

  return upsertDayPlan(db, userId, plan.wave_id, planDate, items, false);
}

export async function loadWaveContextBundle(
  db: D1Database,
  userId: string
): Promise<{ wave: WaveRecord | null; today: DayPlanRecord | null }> {
  const wave = await getActiveWave(db, userId);
  if (!wave) {
    return { wave: null, today: null };
  }
  const today = await getDayPlanForDate(db, userId, todayDateUtc());
  return { wave, today };
}

/** Compact injection for chat system / stub context. */
export function formatActiveWaveInjection(
  wave: WaveRecord | null | undefined,
  today: DayPlanRecord | null | undefined,
  hints?: PlanFactHints | null
): string {
  if (!wave) return '';

  const lines: string[] = [
    `- Active Wave: ${wave.label} · pillar=${wave.primary_pillar} · week ${wave.week} · status=${wave.status}`,
  ];
  if (wave.pillars.length > 1) {
    lines.push(`- Wave pillars: ${wave.pillars.join(', ')}`);
  }
  if (hints?.seasonLabel || hints?.healMode || hints?.healEnergy || hints?.hardWindow) {
    const bits: string[] = [];
    if (hints.seasonLabel) bits.push(`season=${hints.seasonLabel}`);
    if (hints.hardWindow) bits.push(`hard_window=${hints.hardWindow}`);
    if (hints.healMode) bits.push(`heal.mode=${hints.healMode}`);
    if (hints.healEnergy) bits.push(`heal.energy=${hints.healEnergy}`);
    if (hints.healTheme) bits.push(`heal.theme=${hints.healTheme}`);
    lines.push(`- Plan constraints (survey): ${bits.join(' · ')}`);
  }
  if (today?.items.length) {
    const open = today.items.filter((i) => !i.done);
    const done = today.items.filter((i) => i.done);
    lines.push(
      `- Today’s plan (${today.plan_date}, ${today.status}): ` +
        today.items
          .map((i) => `${i.done ? '✓' : '○'} ${i.text}`)
          .join(' · ')
    );
    if (open.length && done.length) {
      lines.push(
        `- Miss framing: unfinished items are fine — Waves bend; invite a soft restart, never shame.`
      );
    } else if (open.length === today.items.length) {
      lines.push(
        `- Miss framing: no guilt if nothing’s checked yet — one tiny action is enough.`
      );
    }
  } else {
    lines.push(`- Today’s plan: not generated yet — keep suggestions tiny and optional.`);
  }

  return `## Active Wave (day plan stub)\n${lines.join('\n')}`;
}

export function serializeWave(wave: WaveRecord) {
  return {
    id: wave.id,
    pillars: wave.pillars,
    primary_pillar: wave.primary_pillar,
    label: wave.label,
    status: wave.status,
    week: wave.week,
    started_at: wave.started_at,
    ends_at: wave.ends_at,
  };
}

export function serializeDayPlan(plan: DayPlanRecord) {
  return {
    id: plan.id,
    wave_id: plan.wave_id,
    date: plan.plan_date,
    items: plan.items,
    status: plan.status,
  };
}
