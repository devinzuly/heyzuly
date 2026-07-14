/**
 * Phase 5d — scheduled check-in nudge logic (stub).
 * Who is due today from rhythm.checkin + soft hard_window prefs.
 * Writes nudge_log rows; does NOT call Resend / Twilio / Meta.
 */

import { formatNudgeBodyForChannel } from './channels';
import { preferredStartHour } from './ics';
import { listUserFacts } from './memory';
import { isCrisisInput } from './safety';
import {
  getActiveWave,
  getDayPlanForDate,
  todayDateUtc,
  type DayPlanRecord,
  type WaveRecord,
} from './waves';
import { CHECKIN_RHYTHMS, type CheckinRhythm } from './onboarding';

export type NudgeChannel = 'app' | 'email' | 'sms' | 'whatsapp';
export type NudgeStatus = 'pending' | 'skipped' | 'sent_stub';

export interface NudgeLogRecord {
  id: number;
  user_id: string;
  planned_for: string;
  channel: NudgeChannel;
  status: NudgeStatus;
  skip_reason: string | null;
  body_preview: string | null;
  created_at: string;
}

export type NudgeSkipReason =
  | 'no_wave'
  | 'rhythm_when_open'
  | 'rhythm_few_times_off_day'
  | 'day_plan_done'
  | 'crisis_recent'
  | 'already_logged'
  | 'no_rhythm'
  | 'nudges_disabled';

/** user_fact `settings.nudges_enabled` — default on when unset. */
function isNudgesEnabledFact(
  facts: Array<{ fact_key: string; fact_value: string }>
): boolean {
  const raw = facts
    .find((f) => f.fact_key === 'settings.nudges_enabled')
    ?.fact_value?.trim()
    .toLowerCase();
  if (raw == null || raw === '') return true;
  return !(
    raw === 'false' ||
    raw === '0' ||
    raw === 'no' ||
    raw === 'off'
  );
}

export interface NudgeDueDecision {
  userId: string;
  due: boolean;
  plannedFor: string;
  channel: NudgeChannel;
  rhythm: CheckinRhythm | null;
  preferredHour: number;
  hardWindow: string | null;
  skipReason?: NudgeSkipReason;
  wave: WaveRecord | null;
  today: DayPlanRecord | null;
  /** Stub body that would be sent (channel-formatted). */
  bodyPreview?: string;
}

interface NudgeLogRow {
  id: number;
  user_id: string;
  planned_for: string;
  channel: string;
  status: string;
  skip_reason: string | null;
  body_preview: string | null;
  created_at: string;
}

function isCheckinRhythm(raw: string | undefined): raw is CheckinRhythm {
  return (
    !!raw &&
    (CHECKIN_RHYTHMS as readonly string[]).includes(raw)
  );
}

function parseRhythm(facts: Array<{ fact_key: string; fact_value: string }>): {
  rhythm: CheckinRhythm | null;
  hardWindow: string | null;
} {
  const map = new Map(facts.map((f) => [f.fact_key, f.fact_value]));
  const raw = map.get('rhythm.checkin')?.trim();
  const hard = map.get('rhythm.hard_window')?.trim() || null;
  return {
    rhythm: isCheckinRhythm(raw) ? raw : null,
    hardWindow: hard,
  };
}

/** few_times_week → Mon / Wed / Fri (UTC), soft cadence. */
export function isFewTimesWeekDay(dateYmd: string): boolean {
  const d = new Date(`${dateYmd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const dow = d.getUTCDay(); // 0 Sun … 6 Sat
  return dow === 1 || dow === 3 || dow === 5;
}

function dayPlanDoneHeavily(plan: DayPlanRecord | null): boolean {
  if (!plan) return false;
  if (plan.status === 'done') return true;
  if (!plan.items.length) return false;
  return plan.items.every((i) => i.done);
}

async function recentCrisisUserTurn(
  db: D1Database,
  userId: string,
  withinHours = 24
): Promise<boolean> {
  const { results } = await db
    .prepare(
      `SELECT content, created_at FROM messages
       WHERE user_id = ? AND role = 'user'
       ORDER BY created_at DESC, id DESC
       LIMIT 8`
    )
    .bind(userId)
    .all<{ content: string; created_at: string }>();

  if (!results?.length) return false;

  const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
  for (const row of results) {
    const ts = Date.parse(row.created_at.replace(' ', 'T') + 'Z');
    if (!Number.isNaN(ts) && ts < cutoff) continue;
    if (isCrisisInput(row.content)) return true;
  }
  return false;
}

/** True if we already stub-sent (or pending) today — skipped rows may upgrade. */
async function hasLogForDay(
  db: D1Database,
  userId: string,
  plannedFor: string,
  channel: NudgeChannel
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM nudge_log
       WHERE user_id = ? AND planned_for = ? AND channel = ?
         AND status IN ('pending', 'sent_stub')
       LIMIT 1`
    )
    .bind(userId, plannedFor, channel)
    .first<{ id: number }>();
  return !!row;
}

export function buildStubNudgeBody(opts: {
  wave: WaveRecord | null;
  rhythm: CheckinRhythm | null;
  preferredHour: number;
}): string {
  const label = opts.wave?.label ?? 'your Wave';
  const week = opts.wave?.week ?? 1;
  const hourNote =
    opts.preferredHour >= 0 && opts.preferredHour <= 23
      ? ` Soft window around ${String(opts.preferredHour).padStart(2, '0')}:00.`
      : '';
  const rhythmNote =
    opts.rhythm === 'few_times_week'
      ? ' A few times a week is plenty.'
      : opts.rhythm === 'when_open'
        ? ' Open when you have a minute.'
        : ' Short is enough.';
  return `Hey — soft check-in for ${label} (week ${week}). How’s today feeling?${rhythmNote}${hourNote} No streak. Waves bend.`;
}

/**
 * Decide whether this user should get a check-in nudge for `plannedFor` (UTC date).
 * Soft prefs only — does not hard-block on clock minute.
 */
export async function decideCheckinNudge(
  db: D1Database,
  userId: string,
  opts?: {
    plannedFor?: string;
    channel?: NudgeChannel;
    now?: Date;
  }
): Promise<NudgeDueDecision> {
  const plannedFor = opts?.plannedFor ?? todayDateUtc(opts?.now);
  const channel: NudgeChannel = opts?.channel ?? 'app';

  // Prefer exact key lookup so FACT_LIMIT truncation cannot hide the toggle.
  const nudgesFactRow = await db
    .prepare(
      `SELECT fact_value FROM user_facts
       WHERE user_id = ? AND fact_key = 'settings.nudges_enabled'
       LIMIT 1`
    )
    .bind(userId)
    .first<{ fact_value: string }>();

  const facts = await listUserFacts(db, userId);
  const { rhythm, hardWindow } = parseRhythm(facts);
  const preferredHour = preferredStartHour(hardWindow ?? undefined);

  const wave = await getActiveWave(db, userId);
  const today = wave
    ? await getDayPlanForDate(db, userId, plannedFor)
    : null;

  const base = {
    userId,
    plannedFor,
    channel,
    rhythm,
    preferredHour,
    hardWindow,
    wave,
    today,
  };

  const nudgesEnabled = nudgesFactRow
    ? isNudgesEnabledFact([
        {
          fact_key: 'settings.nudges_enabled',
          fact_value: nudgesFactRow.fact_value,
        },
      ])
    : isNudgesEnabledFact(facts);

  if (!nudgesEnabled) {
    return { ...base, due: false, skipReason: 'nudges_disabled' };
  }

  if (!wave) {
    return { ...base, due: false, skipReason: 'no_wave' };
  }

  if (!rhythm) {
    return { ...base, due: false, skipReason: 'no_rhythm' };
  }

  if (rhythm === 'when_open') {
    return { ...base, due: false, skipReason: 'rhythm_when_open' };
  }

  if (rhythm === 'few_times_week' && !isFewTimesWeekDay(plannedFor)) {
    return { ...base, due: false, skipReason: 'rhythm_few_times_off_day' };
  }

  if (dayPlanDoneHeavily(today)) {
    return { ...base, due: false, skipReason: 'day_plan_done' };
  }

  if (await recentCrisisUserTurn(db, userId)) {
    return { ...base, due: false, skipReason: 'crisis_recent' };
  }

  if (await hasLogForDay(db, userId, plannedFor, channel)) {
    return { ...base, due: false, skipReason: 'already_logged' };
  }

  const rawBody = buildStubNudgeBody({ wave, rhythm, preferredHour });
  const formatted = formatNudgeBodyForChannel(rawBody, channel);

  return {
    ...base,
    due: true,
    bodyPreview: formatted.text,
  };
}

function rowToLog(row: NudgeLogRow): NudgeLogRecord {
  const channel =
    row.channel === 'email' ||
    row.channel === 'sms' ||
    row.channel === 'whatsapp'
      ? row.channel
      : 'app';
  const status: NudgeStatus =
    row.status === 'skipped' || row.status === 'sent_stub'
      ? row.status
      : 'pending';
  return {
    id: row.id,
    user_id: row.user_id,
    planned_for: row.planned_for,
    channel,
    status,
    skip_reason: row.skip_reason,
    body_preview: row.body_preview,
    created_at: row.created_at,
  };
}

export async function insertNudgeLog(
  db: D1Database,
  entry: {
    userId: string;
    plannedFor: string;
    channel: NudgeChannel;
    status: NudgeStatus;
    skipReason?: string | null;
    bodyPreview?: string | null;
  }
): Promise<NudgeLogRecord | null> {
  const preview = entry.bodyPreview
    ? entry.bodyPreview.slice(0, 400)
    : null;
  // Upsert so a later due run can upgrade skipped → sent_stub same day.
  await db
    .prepare(
      `INSERT INTO nudge_log (
         user_id, planned_for, channel, status, skip_reason, body_preview
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, planned_for, channel) DO UPDATE SET
         status = excluded.status,
         skip_reason = excluded.skip_reason,
         body_preview = excluded.body_preview
       WHERE nudge_log.status = 'skipped'`
    )
    .bind(
      entry.userId,
      entry.plannedFor,
      entry.channel,
      entry.status,
      entry.skipReason ?? null,
      preview
    )
    .run();

  const row = await db
    .prepare(
      `SELECT id, user_id, planned_for, channel, status, skip_reason,
              body_preview, created_at
       FROM nudge_log
       WHERE user_id = ? AND planned_for = ? AND channel = ?
       LIMIT 1`
    )
    .bind(entry.userId, entry.plannedFor, entry.channel)
    .first<NudgeLogRow>();
  return row ? rowToLog(row) : null;
}

export async function listNudgeLogsForUser(
  db: D1Database,
  userId: string,
  limit = 20
): Promise<NudgeLogRecord[]> {
  const safe = Math.min(Math.max(1, Math.floor(limit)), 50);
  const { results } = await db
    .prepare(
      `SELECT id, user_id, planned_for, channel, status, skip_reason,
              body_preview, created_at
       FROM nudge_log
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .bind(userId, safe)
    .all<NudgeLogRow>();
  return (results ?? []).map(rowToLog);
}

/** Candidate user_ids: active wave + rhythm.checkin fact (not when_open). */
export async function listNudgeCandidateUserIds(
  db: D1Database
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT w.user_id AS user_id
       FROM waves w
       INNER JOIN user_facts f
         ON f.user_id = w.user_id AND f.fact_key = 'rhythm.checkin'
       WHERE w.status = 'active'
         AND f.fact_value IN ('daily_light', 'few_times_week')`
    )
    .all<{ user_id: string }>();
  return (results ?? []).map((r) => r.user_id);
}

export interface NudgeRunResult {
  planned_for: string;
  channel: NudgeChannel;
  due: Array<{
    user_id: string;
    preferred_hour: number;
    body_preview: string;
    log_id: number | null;
    status: 'sent_stub';
  }>;
  skipped: Array<{
    user_id: string;
    reason: NudgeSkipReason;
    log_id: number | null;
  }>;
  examined: number;
}

/**
 * Cron/dev runner: evaluate candidates, write stub “would send” / skipped rows.
 * Never calls email/SMS/WhatsApp vendors.
 */
export async function runCheckinNudgeStub(
  db: D1Database,
  opts?: {
    plannedFor?: string;
    channel?: NudgeChannel;
    /** When set, only evaluate this user (dev dry-run). */
    onlyUserId?: string;
    /** Persist skipped rows too (default true for audit). */
    logSkips?: boolean;
    now?: Date;
  }
): Promise<NudgeRunResult> {
  const plannedFor = opts?.plannedFor ?? todayDateUtc(opts?.now);
  const channel: NudgeChannel = opts?.channel ?? 'app';
  const logSkips = opts?.logSkips !== false;

  const candidates = opts?.onlyUserId
    ? [opts.onlyUserId]
    : await listNudgeCandidateUserIds(db);

  const due: NudgeRunResult['due'] = [];
  const skipped: NudgeRunResult['skipped'] = [];

  for (const userId of candidates) {
    const decision = await decideCheckinNudge(db, userId, {
      plannedFor,
      channel,
      now: opts?.now,
    });

    if (decision.due && decision.bodyPreview) {
      const log = await insertNudgeLog(db, {
        userId,
        plannedFor,
        channel,
        status: 'sent_stub',
        bodyPreview: decision.bodyPreview,
      });
      due.push({
        user_id: userId,
        preferred_hour: decision.preferredHour,
        body_preview: decision.bodyPreview,
        log_id: log?.id ?? null,
        status: 'sent_stub',
      });
      continue;
    }

    const reason = decision.skipReason ?? 'no_rhythm';
    let logId: number | null = null;
    if (
      logSkips &&
      reason !== 'already_logged' &&
      reason !== 'rhythm_when_open' &&
      reason !== 'rhythm_few_times_off_day'
    ) {
      const log = await insertNudgeLog(db, {
        userId,
        plannedFor,
        channel,
        status: 'skipped',
        skipReason: reason,
        bodyPreview: null,
      });
      logId = log?.id ?? null;
    }
    skipped.push({ user_id: userId, reason, log_id: logId });
  }

  return {
    planned_for: plannedFor,
    channel,
    due,
    skipped,
    examined: candidates.length,
  };
}

/** Client-facing soft estimate from rhythm (+ optional hard_window). */
export function estimateNextCheckin(opts: {
  rhythm: string | null | undefined;
  hardWindow?: string | null;
  now?: Date;
}): {
  label: string;
  scheduled: boolean;
  preferred_hour: number | null;
  planned_for: string | null;
} {
  const now = opts.now ?? new Date();
  const today = todayDateUtc(now);
  const rhythm = opts.rhythm?.trim() ?? null;
  const hour = preferredStartHour(opts.hardWindow ?? undefined);

  if (!rhythm || rhythm === 'when_open') {
    return {
      label: 'When you open the app',
      scheduled: false,
      preferred_hour: null,
      planned_for: null,
    };
  }

  if (rhythm === 'few_times_week') {
    if (isFewTimesWeekDay(today)) {
      return {
        label: `Today ~${String(hour).padStart(2, '0')}:00 (few×/week)`,
        scheduled: true,
        preferred_hour: hour,
        planned_for: today,
      };
    }
    // Next Mon/Wed/Fri UTC
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + i);
      const ymd = todayDateUtc(d);
      if (isFewTimesWeekDay(ymd)) {
        return {
          label: `Next soft day ${ymd} ~${String(hour).padStart(2, '0')}:00`,
          scheduled: true,
          preferred_hour: hour,
          planned_for: ymd,
        };
      }
    }
  }

  // daily_light (default)
  return {
    label: `Today ~${String(hour).padStart(2, '0')}:00 (daily, light)`,
    scheduled: true,
    preferred_hour: hour,
    planned_for: today,
  };
}

export function serializeNudgeLog(row: NudgeLogRecord) {
  return {
    id: row.id,
    planned_for: row.planned_for,
    channel: row.channel,
    status: row.status,
    skip_reason: row.skip_reason,
    body_preview: row.body_preview,
    created_at: row.created_at,
  };
}
