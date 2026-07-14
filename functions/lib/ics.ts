/**
 * ICS (RFC 5545) export for today’s day_plan + optional soft Wave check-in.
 * Shame-free growth copy — no streaks, no guilt.
 */

import type {
  DayPlanItem,
  DayPlanRecord,
  PlanFactHints,
  WaveRecord,
} from './waves';

const PRODID = '-//Hey Zuly//Wave Day Plan//EN';

export interface IcsHints extends PlanFactHints {
  checkinRhythm?: string;
}

export interface IcsBuildInput {
  wave: WaveRecord;
  today: DayPlanRecord;
  hints?: IcsHints | null;
  /** Override “now” for DTSTAMP / tests. */
  now?: Date;
}

/** Prefer slots outside the hardest window (mirrors day-plan timing cues). */
export function preferredStartHour(hardWindow: string | undefined): number {
  if (!hardWindow || /^it depends/i.test(hardWindow.trim())) return 18;
  if (/^mornings/i.test(hardWindow)) return 18;
  if (/^midday/i.test(hardWindow)) return 9;
  if (/^evenings/i.test(hardWindow)) return 10;
  if (/late\s*night/i.test(hardWindow)) return 19;
  return 18;
}

/** Short block matching heal.energy when present. */
export function durationMinutesFromEnergy(healEnergy: string | undefined): number {
  if (!healEnergy) return 10;
  const e = healEnergy.trim();
  if (/^2\s*min/i.test(e) || /^only when/i.test(e)) return 2;
  if (/^15\+/i.test(e)) return 15;
  if (/5\s*[–\-]\s*10/.test(e) || /^5/.test(e)) return 8;
  return 10;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Floating local DATETIME (no Z) so calendar apps show the wall-clock slot. */
export function formatIcsLocalDateTime(
  planDate: string,
  hour: number,
  minute: number
): string {
  const ymd = planDate.replace(/-/g, '').slice(0, 8);
  const h = Math.min(23, Math.max(0, Math.floor(hour)));
  const m = Math.min(59, Math.max(0, Math.floor(minute)));
  return `${ymd}T${pad2(h)}${pad2(m)}00`;
}

function formatIcsUtcStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const h = pad2(d.getUTCHours());
  const mi = pad2(d.getUTCMinutes());
  const s = pad2(d.getUTCSeconds());
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold long content lines at 75 octets (approx ASCII; fine for our ASCII-heavy copy). */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function pillarShort(pillar: string): string {
  const map: Record<string, string> = {
    meditation: 'Meditation',
    'self-healing': 'Self-healing',
    body: 'Body',
    'life-guidance': 'Life',
  };
  return map[pillar] ?? 'Wave';
}

/** Growth title — invitation, not a streak obligation. */
export function eventSummaryForItem(item: DayPlanItem): string {
  const label = pillarShort(item.pillar);
  const text = item.text.trim();
  const short =
    text.length > 72 ? `${text.slice(0, 69).trimEnd()}…` : text;
  return `Tiny step · ${label}: ${short}`.slice(0, 120);
}

function eventDescriptionForItem(item: DayPlanItem, wave: WaveRecord): string {
  return [
    item.text.trim(),
    '',
    `Part of your ${wave.label} (week ${wave.week}). Optional — Waves bend. Missing is fine.`,
  ].join('\n');
}

function checkinSummary(wave: WaveRecord): string {
  return `Soft check-in · ${wave.label}`;
}

function checkinDescription(wave: WaveRecord, rhythm: string | undefined): string {
  const rhythmNote =
    rhythm === 'few_times_week'
      ? 'A few times a week is plenty — open when it fits.'
      : rhythm === 'when_open'
        ? 'No pressure to schedule this — open the app when you have a minute.'
        : 'A light daily check-in with Zuly — short is enough.';
  return [
    `Gentle Wave check-in for ${wave.label} (week ${wave.week}).`,
    rhythmNote,
    'No streak. No catch-up guilt. Show up messy if you need to.',
  ].join('\n');
}

function shouldIncludeCheckin(rhythm: string | undefined): boolean {
  if (!rhythm) return true;
  if (rhythm === 'when_open') return false;
  return (
    rhythm === 'daily_light' ||
    rhythm === 'few_times_week' ||
    /daily|few|week/i.test(rhythm)
  );
}

function addMinutes(
  hour: number,
  minute: number,
  add: number
): { hour: number; minute: number } {
  let total = hour * 60 + minute + add;
  if (total < 0) total = 0;
  if (total >= 24 * 60) total = 24 * 60 - 1;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

interface BuiltEvent {
  uid: string;
  dtStart: string;
  dtEnd: string;
  summary: string;
  description: string;
}

function buildItemEvents(
  wave: WaveRecord,
  today: DayPlanRecord,
  hints: IcsHints | null | undefined
): BuiltEvent[] {
  const startHour = preferredStartHour(hints?.hardWindow);
  const duration = durationMinutesFromEnergy(hints?.healEnergy);
  const gap = 5;
  const events: BuiltEvent[] = [];
  let minuteOfDay = startHour * 60;

  for (const item of today.items) {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    if (hour >= 23 && minute + duration > 59) break;

    const end = addMinutes(hour, minute, duration);
    events.push({
      uid: `wave-${wave.id}-day-${today.plan_date}-${item.id}@heyzuly.com`,
      dtStart: formatIcsLocalDateTime(today.plan_date, hour, minute),
      dtEnd: formatIcsLocalDateTime(today.plan_date, end.hour, end.minute),
      summary: eventSummaryForItem(item),
      description: eventDescriptionForItem(item, wave),
    });

    minuteOfDay += duration + gap;
  }

  return events;
}

function buildCheckinEvent(
  wave: WaveRecord,
  today: DayPlanRecord,
  hints: IcsHints | null | undefined,
  afterMinuteOfDay: number
): BuiltEvent | null {
  if (!shouldIncludeCheckin(hints?.checkinRhythm)) return null;

  const preferred = preferredStartHour(hints?.hardWindow) * 60 + 45;
  const startMin = Math.max(afterMinuteOfDay + 5, preferred);
  const capped = Math.min(startMin, 22 * 60);
  const hour = Math.floor(capped / 60);
  const minute = capped % 60;
  const end = addMinutes(hour, minute, 5);

  return {
    uid: `wave-${wave.id}-checkin-${today.plan_date}@heyzuly.com`,
    dtStart: formatIcsLocalDateTime(today.plan_date, hour, minute),
    dtEnd: formatIcsLocalDateTime(today.plan_date, end.hour, end.minute),
    summary: checkinSummary(wave),
    description: checkinDescription(wave, hints?.checkinRhythm),
  };
}

function veventLines(event: BuiltEvent, dtStamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${event.dtStart}`,
    `DTEND:${event.dtEnd}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ];
}

/**
 * Build a VCALENDAR document for today’s tiny actions (+ optional soft check-in).
 */
export function buildTodayIcs(input: IcsBuildInput): string {
  const { wave, today, hints, now = new Date() } = input;
  const dtStamp = formatIcsUtcStamp(now);

  const itemEvents = buildItemEvents(wave, today, hints);
  let lastEndMinute = preferredStartHour(hints?.hardWindow) * 60;
  if (itemEvents.length) {
    const last = itemEvents[itemEvents.length - 1]!;
    const endRaw = last.dtEnd.slice(9); // HHMMSS
    lastEndMinute =
      Number(endRaw.slice(0, 2)) * 60 + Number(endRaw.slice(2, 4));
  }

  const checkin = buildCheckinEvent(wave, today, hints, lastEndMinute);
  const events = checkin ? [...itemEvents, checkin] : itemEvents;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Hey Zuly — today',
  ];

  for (const event of events) {
    for (const line of veventLines(event, dtStamp)) {
      lines.push(foldIcsLine(line));
    }
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function icsFilename(planDate: string): string {
  return `heyzuly-today-${planDate}.ics`;
}
