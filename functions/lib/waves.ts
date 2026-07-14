/**
 * Phase 5a — D1 waves / day_plans + 4-week First Wave curricula.
 * No LLM. Week seeds + soft-launch survey fact branching.
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
import {
  WAVE_TEMPLATE_WEEKS,
  clampWaveWeek,
  computeWaveWeek,
  getWeekTemplate,
  weekSeedPool,
  type WaveWeekTemplate,
} from './wave-templates';

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
  medLength?: string;
  medExperience?: string;
  bodyModality?: string;
  bodyCapacity?: string;
  lifeDomains?: string;
  lifeLighter10?: string;
  lifeSupportPref?: string;
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

const WAVE_DURATION_WEEKS = WAVE_TEMPLATE_WEEKS;

/** Shame-free finish copy — matches goldens ex-070 / ho-018 (not ex-077). */
export const WAVE_COMPLETE_CELEBRATION = {
  headline: 'Four weeks showing up',
  body: "That's not luck — that's you. No reinvention speech needed. Want to keep a lighter rhythm, start a new Wave later, or just enjoy the finish for a minute?",
} as const;

/** Parse sqlite / ISO datetime-ish strings to Date (UTC-friendly). */
export function parseWaveDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withT = trimmed.includes('T')
    ? trimmed.replace(' ', 'T')
    : trimmed.replace(' ', 'T');
  const iso =
    withT.includes(':') || withT.length > 10
      ? withT
      : `${withT}T00:00:00`;
  const d = new Date(
    /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}.000Z`
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when ends_at (or started_at + 4 weeks) is at or before now. */
export function waveEndsAtPassed(
  wave: Pick<WaveRecord, 'started_at' | 'ends_at'>,
  now: Date = new Date()
): boolean {
  const ends = parseWaveDate(wave.ends_at);
  if (ends) return now.getTime() >= ends.getTime();
  const start = parseWaveDate(wave.started_at);
  if (!start) return false;
  const ms = WAVE_DURATION_WEEKS * 7 * 24 * 60 * 60 * 1000;
  return now.getTime() >= start.getTime() + ms;
}

/**
 * Auto-complete when week ≥ 4 and ends_at has passed.
 * Explicit complete allowed any time in week 4 (user chooses).
 */
export function shouldAutoCompleteWave(
  wave: WaveRecord,
  now: Date = new Date()
): boolean {
  if (wave.status !== 'active') return false;
  return wave.week >= 4 && waveEndsAtPassed(wave, now);
}

export function canExplicitlyCompleteWave(
  wave: WaveRecord,
  now: Date = new Date()
): boolean {
  if (wave.status !== 'active') return false;
  return wave.week >= 4 || waveEndsAtPassed(wave, now);
}

export function serializeCelebration(wave: WaveRecord) {
  return {
    headline: WAVE_COMPLETE_CELEBRATION.headline,
    body: WAVE_COMPLETE_CELEBRATION.body,
    wave_id: wave.id,
    label: wave.label,
    primary_pillar: wave.primary_pillar,
    pillars: wave.pillars,
  };
}

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
  const medLen = map.get('med.length_min')?.trim();
  const medExp = map.get('med.experience')?.trim();
  const bodyMod = map.get('body.modality')?.trim();
  const bodyCap = map.get('body.capacity')?.trim();
  const lifeDom = map.get('life.domains')?.trim();
  const lifeLight = map.get('life.lighter_10')?.trim();
  const lifeSup = map.get('life.support_pref')?.trim();
  if (season) hints.seasonLabel = season;
  if (hard) hints.hardWindow = hard;
  if (theme) hints.healTheme = theme;
  if (mode) hints.healMode = mode;
  if (energy) hints.healEnergy = energy;
  if (medLen) hints.medLength = medLen;
  if (medExp) hints.medExperience = medExp;
  if (bodyMod) hints.bodyModality = bodyMod;
  if (bodyCap) hints.bodyCapacity = bodyCap;
  if (lifeDom) hints.lifeDomains = lifeDom;
  if (lifeLight) hints.lifeLighter10 = lifeLight;
  if (lifeSup) hints.lifeSupportPref = lifeSup;
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

/** True when survey facts say keep the day tiny (low energy / recovery / 2-min). */
export function isConstrainedPlanDay(hints: PlanFactHints): boolean {
  return (
    isLowEnergy(hints.healEnergy) ||
    /recovery|pain|low energy|rest-first|^2\s*min/i.test(
      `${hints.bodyCapacity ?? ''} ${hints.bodyModality ?? ''} ${hints.medLength ?? ''}`
    )
  );
}

/**
 * Max tiny actions for today (1–3). Honors heal.energy + recovery signals.
 * Secondary pillar can allow one extra when not low-energy.
 */
export function dayPlanItemCap(
  hints: PlanFactHints,
  hasSecondary = false
): number {
  const low = isConstrainedPlanDay(hints);
  const high = isHighEnergy(hints.healEnergy);
  let targetCount = 3;
  if (low) targetCount = hasSecondary ? 2 : 1;
  else if (hints.healEnergy && !high) targetCount = hasSecondary ? 3 : 2;
  return Math.min(3, Math.max(1, targetCount));
}

/** Normalize client/LLM item lists before writing to day_plans. */
export function normalizeDayPlanItems(
  raw: unknown,
  fallbackPillar: PillarId,
  maxCount = 3
): DayPlanItem[] {
  if (!Array.isArray(raw)) return [];
  const cap = Math.min(3, Math.max(1, maxCount));
  const out: DayPlanItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const text =
      typeof obj.text === 'string' ? obj.text.trim().slice(0, 200) : '';
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const pillar = isPillarId(obj.pillar) ? obj.pillar : fallbackPillar;
    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim().slice(0, 32)
        : `t${out.length + 1}`;
    out.push({
      id,
      text,
      pillar,
      done: obj.done === true,
    });
    if (out.length >= cap) break;
  }
  // Re-id sequentially for a clean day_plans JSON shape.
  return out.map((item, i) => ({ ...item, id: `t${i + 1}` }));
}

/** Replace today’s day_plan items (confirm path after Talk → build). */
export async function replaceTodayItems(
  db: D1Database,
  userId: string,
  wave: WaveRecord,
  items: DayPlanItem[]
): Promise<DayPlanRecord> {
  const planDate = todayDateUtc();
  const factRows = await listUserFacts(db, userId);
  const hints = planHintsFromFacts(factRows);
  const hasSecondary = wave.pillars.some((p) => p !== wave.primary_pillar);
  const capped = normalizeDayPlanItems(
    items,
    wave.primary_pillar,
    dayPlanItemCap(hints, hasSecondary)
  );
  if (!capped.length) {
    throw new Error('items_empty');
  }
  return upsertDayPlan(db, userId, wave.id, planDate, capped, true);
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

const MED_SHORT: string[] = [
  'Two slow breaths at a doorway — in for 4, out for 6.',
  'Sit for one minute: notice three sounds, then carry on.',
  'Feel both feet on the floor for three breaths — that’s the practice.',
];

const MED_MID: string[] = [
  'Five quiet minutes — breath or body, no fixing.',
  'A short sit: when the mind wanders, name it once and return.',
  'Three rounds of gentle breath, then pause and notice.',
];

const BODY_WALK: string[] = [
  'Walk for three minutes — soft pace, no step-count theater.',
  'Step outside (or hall) once today for a short walk loop.',
  'Walk to the furthest window and back — counts as movement.',
];

const BODY_STRETCH: string[] = [
  'Stretch shoulders or hips for one minute — stop when it softens.',
  'Two gentle mobility moves: neck or wrists, then done.',
  'Unwind one tight spot for 60 seconds — no forcing.',
];

const BODY_REST: string[] = [
  'Rest-first: lie down or sit with soft music for two minutes.',
  'One recovery minute — jaw unclench, shoulders drop, stop.',
  'Choose rest as the practice: water + still for 90 seconds.',
];

const BODY_STRENGTH: string[] = [
  'Eight gentle sit-to-stands or wall pushes — stop early if needed.',
  'One light strength set: 5 slow reps, then done.',
  'Bodyweight, kinder: two sets of something easy (or skip day).',
];

function medPool(hints: PlanFactHints): string[] {
  const len = hints.medLength ?? '';
  if (/^2\s*min|not sure/i.test(len)) return MED_SHORT;
  if (/^5\b|^10\b/i.test(len)) return MED_MID;
  if (/^15\+/i.test(len)) {
    return [
      'Ten calm minutes if you have them — stop at five if energy dips.',
      'A longer sit is optional: start with five, leave when ready.',
      ...MED_MID,
    ];
  }
  if (/brand new|fell off/i.test(hints.medExperience ?? '')) return MED_SHORT;
  return TEMPLATES.meditation;
}

function bodyPool(hints: PlanFactHints): string[] {
  const mod = hints.bodyModality ?? '';
  const cap = hints.bodyCapacity ?? '';
  if (/recovery|pain|low energy|rest-first/i.test(`${mod} ${cap}`)) {
    return BODY_REST;
  }
  if (/walk/i.test(mod)) return BODY_WALK;
  if (/stretch|mobility|yoga/i.test(mod)) return BODY_STRETCH;
  if (/strength/i.test(mod)) return BODY_STRENGTH;
  if (/dance|fun|mix/i.test(mod)) {
    return [
      'Two minutes of movement that feels fun — sway, stretch, or walk.',
      'Pick the least punish-y option: walk, stretch, or dance for 3 minutes.',
      ...BODY_WALK,
    ];
  }
  if (/ready to build/i.test(cap)) return [...BODY_STRENGTH, ...BODY_WALK];
  if (/okay if short/i.test(cap)) return BODY_STRETCH;
  return TEMPLATES.body;
}

function lifePool(hints: PlanFactHints): string[] {
  if (hints.lifeLighter10) {
    const snippet = hints.lifeLighter10.slice(0, 80);
    return [
      `Tiny step toward: ${snippet}`,
      `Revisit your 10%-lighter idea once — one action only: ${snippet}`,
      'Name one friction that made today heavier — park a fix for tomorrow.',
    ];
  }
  const dom = hints.lifeDomains ?? '';
  if (/work|career/i.test(dom)) {
    return [
      'Protect one work boundary for 10 minutes (or leave one Slack unread).',
      'Write the next smallest work step — do only that, then stop.',
      ...TEMPLATES['life-guidance'],
    ];
  }
  if (/relationship/i.test(dom)) {
    return [
      'Send one kind or clarifying note — short is fine.',
      'Choose space or reconnect for 5 minutes — your call, no guilt.',
      ...TEMPLATES['life-guidance'],
    ];
  }
  if (/habit|routine/i.test(dom)) {
    return [
      'Stack one tiny habit onto something you already do.',
      'Prep one cue for tomorrow (shoes out, glass of water, calendar block).',
      ...TEMPLATES['life-guidance'],
    ];
  }
  if (/money/i.test(dom)) {
    return [
      'One money-feel check: open balances for two minutes — no spiral.',
      'Name one money stressor; schedule a 5-minute look later if needed.',
      ...TEMPLATES['life-guidance'],
    ];
  }
  return TEMPLATES['life-guidance'];
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
    week: clampWaveWeek(Number(row.week) || 1),
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
  hints: PlanFactHints,
  week = 1
): string[] {
  const weekSeeds = weekSeedPool(pillar, week);
  // Survey-tuned pools still enrich variety; week curriculum leads.
  let surveyPool: string[] = TEMPLATES[pillar];
  if (pillar === 'self-healing') {
    surveyPool = healModePool(hints.healMode);
  } else if (pillar === 'meditation') {
    surveyPool = medPool(hints);
  } else if (pillar === 'body') {
    surveyPool = bodyPool(hints);
  } else if (pillar === 'life-guidance') {
    surveyPool = lifePool(hints);
  }
  return [...weekSeeds, ...surveyPool];
}

/**
 * Canned day-plan items from 4-week template seeds + soft-launch survey facts.
 * No Anthropic. Week → curriculum seeds; low energy → fewer/shorter; hard_window → timing cue.
 */
export function buildTodayItems(
  primary: PillarId,
  secondary?: PillarId | null,
  seed = 0,
  hints: PlanFactHints = {},
  week = 1
): DayPlanItem[] {
  const weekNum = clampWaveWeek(week);
  const primaryPool = poolForPillar(primary, hints, weekNum);
  const secondaryPool =
    secondary && secondary !== primary
      ? poolForPillar(secondary, hints, weekNum)
      : null;

  const pick = (pool: string[], offset: number): string =>
    pool[Math.abs(offset) % pool.length]!;

  const low = isConstrainedPlanDay(hints);
  const targetCount = dayPlanItemCap(hints, Boolean(secondaryPool));

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
  userId: string,
  now: Date = new Date()
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
  if (!row) return null;
  const advanced = await advanceWaveWeekIfNeeded(db, rowToWave(row), now);
  if (shouldAutoCompleteWave(advanced, now)) {
    await completeWaveRecord(db, advanced);
    return null;
  }
  return advanced;
}

/** Most recent completed Wave (for Grow celebration + chat inject). */
export async function getLatestCompletedWave(
  db: D1Database,
  userId: string
): Promise<WaveRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, pillars, primary_pillar, label, status, week,
              started_at, ends_at, created_at, updated_at
       FROM waves
       WHERE user_id = ? AND status = 'completed'
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<WaveRow>();
  return row ? rowToWave(row) : null;
}

/**
 * Mark a Wave completed + sync user_facts.
 * Caller must check eligibility (week 4 / ends_at / auto).
 */
export async function completeWaveRecord(
  db: D1Database,
  wave: WaveRecord
): Promise<WaveRecord> {
  if (wave.status === 'completed') {
    await syncWaveFacts(db, wave.user_id, wave);
    return wave;
  }

  await db
    .prepare(
      `UPDATE waves
       SET status = 'completed', week = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
    .bind(Math.max(wave.week, 4), wave.id, wave.user_id)
    .run();

  const completed: WaveRecord = {
    ...wave,
    status: 'completed',
    week: Math.max(wave.week, 4),
    updated_at: new Date().toISOString(),
  };
  await syncWaveFacts(db, wave.user_id, completed);
  return completed;
}

/**
 * Explicit user complete — week 4 (or past ends_at).
 * Returns null when no eligible active Wave.
 */
export async function completeActiveWave(
  db: D1Database,
  userId: string,
  now: Date = new Date()
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
  if (!row) return null;

  const advanced = await advanceWaveWeekIfNeeded(db, rowToWave(row), now);
  if (!canExplicitlyCompleteWave(advanced, now)) {
    return null;
  }
  return completeWaveRecord(db, advanced);
}

/**
 * Advance wave.week from calendar time since started_at (1–4).
 * Persists when the computed week differs from the stored value.
 */
export async function advanceWaveWeekIfNeeded(
  db: D1Database,
  wave: WaveRecord,
  now: Date = new Date()
): Promise<WaveRecord> {
  const nextWeek = computeWaveWeek(wave.started_at, now);
  if (nextWeek === wave.week) return wave;

  await db
    .prepare(
      `UPDATE waves SET week = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
    )
    .bind(nextWeek, wave.id, wave.user_id)
    .run();

  const updated: WaveRecord = { ...wave, week: nextWeek };
  await syncWaveFacts(db, wave.user_id, updated);
  return updated;
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

/** Compact day-plan row for Plan tab history (shame-free empties allowed). */
export interface DayPlanHistoryEntry {
  date: string;
  status: DayPlanStatus | null;
  has_plan: boolean;
  done_count: number;
  open_count: number;
  item_count: number;
  /** Short item texts (first few), for a light UI summary. */
  summary: string[];
}

function shiftDateUtc(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function summarizeDayPlan(plan: DayPlanRecord): DayPlanHistoryEntry {
  const doneCount = plan.items.filter((i) => i.done).length;
  const openCount = plan.items.length - doneCount;
  return {
    date: plan.plan_date,
    status: plan.status,
    has_plan: true,
    done_count: doneCount,
    open_count: openCount,
    item_count: plan.items.length,
    summary: plan.items.slice(0, 2).map((i) => {
      const t = i.text.trim();
      return t.length > 48 ? `${t.slice(0, 46).trimEnd()}…` : t;
    }),
  };
}

/**
 * Last N calendar days (UTC), newest-last for chronologic UI.
 * Days without a day_plan return has_plan=false (empty is ok — no guilt).
 */
export async function listDayPlanHistory(
  db: D1Database,
  userId: string,
  days = 7,
  now: Date = new Date()
): Promise<DayPlanHistoryEntry[]> {
  const safeDays = Math.min(Math.max(1, Math.floor(days)), 31);
  const end = todayDateUtc(now);
  const start = shiftDateUtc(end, -(safeDays - 1));

  const { results } = await db
    .prepare(
      `SELECT id, user_id, wave_id, plan_date, items_json, status, created_at, updated_at
       FROM day_plans
       WHERE user_id = ? AND plan_date >= ? AND plan_date <= ?
       ORDER BY plan_date ASC`
    )
    .bind(userId, start, end)
    .all<DayPlanRow>();

  const byDate = new Map<string, DayPlanHistoryEntry>();
  for (const row of results ?? []) {
    byDate.set(row.plan_date, summarizeDayPlan(rowToDayPlan(row)));
  }

  const out: DayPlanHistoryEntry[] = [];
  for (let i = 0; i < safeDays; i++) {
    const date = shiftDateUtc(start, i);
    out.push(
      byDate.get(date) ?? {
        date,
        status: null,
        has_plan: false,
        done_count: 0,
        open_count: 0,
        item_count: 0,
        summary: [],
      }
    );
  }
  return out;
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
    status: wave.status === 'completed' ? 'completed' : 'active',
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
    hints,
    wave.week
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
): Promise<{
  wave: WaveRecord | null;
  today: DayPlanRecord | null;
  completed: WaveRecord | null;
}> {
  const wave = await getActiveWave(db, userId);
  if (wave) {
    const today = await getDayPlanForDate(db, userId, todayDateUtc());
    return { wave, today, completed: null };
  }
  const completed = await getLatestCompletedWave(db, userId);
  return { wave: null, today: null, completed };
}

/** Compact injection for chat system / stub context. */
export function formatActiveWaveInjection(
  wave: WaveRecord | null | undefined,
  today: DayPlanRecord | null | undefined,
  hints?: PlanFactHints | null,
  completed?: WaveRecord | null
): string {
  if (wave) {
    const weekTpl = getWeekTemplate(wave.primary_pillar, wave.week);
    const lines: string[] = [
      `- Active Wave: ${wave.label} · pillar=${wave.primary_pillar} · week ${wave.week}/${WAVE_DURATION_WEEKS} · status=${wave.status}`,
      `- Week theme: ${weekTpl.theme} — ${weekTpl.focus}`,
      `- Week check-in prompt: ${weekTpl.checkInPrompt}`,
    ];
    if (wave.pillars.length > 1) {
      lines.push(`- Wave pillars: ${wave.pillars.join(', ')}`);
    }
    if (canExplicitlyCompleteWave(wave)) {
      lines.push(
        `- Week 4 finish available: if they choose to complete the Wave, celebrate with growth language — never reinvent/rebuild/NEW YOU hype; soft next-Wave invite only, no pressure.`
      );
    }
    if (
      hints?.seasonLabel ||
      hints?.healMode ||
      hints?.healEnergy ||
      hints?.hardWindow
    ) {
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
      lines.push(
        `- Today’s plan: not generated yet — keep suggestions tiny and optional.`
      );
    }

    return `## Active Wave\n${lines.join('\n')}`;
  }

  if (completed && completed.status === 'completed') {
    const lines = [
      `- Completed Wave: ${completed.label} · pillar=${completed.primary_pillar} · week ${completed.week}/${WAVE_DURATION_WEEKS} · status=completed`,
      `- Celebration tone: "${WAVE_COMPLETE_CELEBRATION.headline}. ${WAVE_COMPLETE_CELEBRATION.body}"`,
      `- Never use reinvent / rebuild / NEW YOU / brand new woman / transformation hype.`,
      `- Soft next step only if they ask: lighter rhythm, new Wave later (same or new pillars), or just enjoy the finish. No pressure to start immediately.`,
    ];
    if (completed.pillars.length > 1) {
      lines.splice(
        1,
        0,
        `- Finished pillars: ${completed.pillars.join(', ')}`
      );
    }
    return `## Wave complete\n${lines.join('\n')}`;
  }

  return '';
}

export function serializeWave(wave: WaveRecord) {
  const weekTpl = getWeekTemplate(wave.primary_pillar, wave.week);
  const seedPool = weekTpl.seeds;
  const dayBucket = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const weekSeed =
    seedPool.length > 0 ? seedPool[dayBucket % seedPool.length]! : '';
  return {
    id: wave.id,
    pillars: wave.pillars,
    primary_pillar: wave.primary_pillar,
    label: wave.label,
    status: wave.status,
    week: wave.week,
    started_at: wave.started_at,
    ends_at: wave.ends_at,
    week_theme: weekTpl.theme,
    week_focus: weekTpl.focus,
    week_check_in: weekTpl.checkInPrompt,
    /** One rotated seed from the week template — optional Practice with Zuly. */
    week_seed: weekSeed,
    weeks: serializeCurriculumWeeks(wave.primary_pillar),
  };
}

function serializeCurriculumWeeks(pillar: PillarId): Array<{
  week: number;
  theme: string;
  focus: string;
}> {
  return [1, 2, 3, 4].map((w) => {
    const tpl = getWeekTemplate(pillar, w);
    return { week: tpl.week, theme: tpl.theme, focus: tpl.focus };
  });
}

/** Expose current week template for API / Grow (re-export shape). */
export function currentWeekTemplate(
  pillar: PillarId,
  week: number
): WaveWeekTemplate {
  return getWeekTemplate(pillar, week);
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
