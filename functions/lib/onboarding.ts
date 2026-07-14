/**
 * Phase 4 onboarding micro-flow — name → pillars → rhythm → seed facts.
 * Optional soft-launch survey banks (G1/G2 + selected pillar musts) — skippable.
 */

import {
  defaultWaveLabel,
  isPillarId,
  PILLARS,
  type PillarId,
  upsertFact,
  upsertMemoryFacts,
  upsertWavePrefs,
} from './memory';
import { completeOnboarding } from './users';
import { ensureFirstWave, type WaveRecord, type DayPlanRecord } from './waves';

export const CHECKIN_RHYTHMS = [
  'daily_light',
  'few_times_week',
  'when_open',
] as const;

export type CheckinRhythm = (typeof CHECKIN_RHYTHMS)[number];

export const PILLAR_LABELS: Record<PillarId, string> = {
  meditation: 'Meditation',
  'self-healing': 'Self-healing',
  body: 'Body',
  'life-guidance': 'Life guidance',
};

export const RHYTHM_LABELS: Record<CheckinRhythm, string> = {
  daily_light: 'Daily, light check-ins',
  few_times_week: 'A few times a week',
  when_open: 'When I open the app',
};

/** G1 — season.label */
export const SEASON_LABELS = [
  'Stretching at work',
  'Healing something heavy',
  'Getting my body back',
  'Straightening life/relationships',
  'A mix / unsure',
] as const;

/** G2 — rhythm.hard_window */
export const HARD_WINDOWS = [
  'Mornings',
  'Midday',
  'Evenings',
  'Late night',
  'It depends',
] as const;

/** S1 — heal.theme (pick up to 2) */
export const HEAL_THEMES = [
  'Rumination / replaying',
  'Self-criticism',
  'Overwhelm',
  'Low mood stretch',
  'Conflict hangover',
  'Numb / flat',
  'Other',
] as const;

/** S2 — heal.mode */
export const HEAL_MODES = [
  'Write privately',
  'Talk it out with Zuly',
  'Mix',
  'Small actions first, words later',
] as const;

/** S3 — heal.energy */
export const HEAL_ENERGIES = [
  '2 min',
  '5–10',
  '15+',
  'Only when I need it',
] as const;

/** M1 — med.length_min */
export const MED_LENGTHS = [
  '2 min',
  '5',
  '10',
  '15+',
  'Not sure yet',
] as const;

/** M2 — med.experience */
export const MED_EXPERIENCES = [
  'Brand new',
  'Tried apps, fell off',
  'Decent habit',
  'Love it but inconsistent',
] as const;

/** B1 — body.modality */
export const BODY_MODALITIES = [
  'Walk',
  'Stretch / mobility',
  'Strength lite',
  'Dance / fun',
  'Yoga-ish',
  'Mix',
  'Rest-first for now',
] as const;

/** B2 — body.capacity */
export const BODY_CAPACITIES = [
  'Low energy',
  'Okay if short',
  'Ready to build',
  'Recovery / pain — go easy',
  'Prefer not to say',
] as const;

/** L1 — life.domains (pick up to 2) */
export const LIFE_DOMAINS = [
  'Work / career',
  'Relationships',
  'Home / family load',
  'Money feel (not advice)',
  'Habits / routines',
  'Self / identity',
] as const;

/** L3 — life.support_pref (pick up to 2) */
export const LIFE_SUPPORT_PREFS = [
  'Kind words',
  'Someone showing up / time',
  'Help with tasks',
  'Practical ideas',
  'Space alone first',
] as const;

export type SeasonLabel = (typeof SEASON_LABELS)[number];
export type HardWindow = (typeof HARD_WINDOWS)[number];
export type HealTheme = (typeof HEAL_THEMES)[number];
export type HealMode = (typeof HEAL_MODES)[number];
export type HealEnergy = (typeof HEAL_ENERGIES)[number];
export type MedLength = (typeof MED_LENGTHS)[number];
export type MedExperience = (typeof MED_EXPERIENCES)[number];
export type BodyModality = (typeof BODY_MODALITIES)[number];
export type BodyCapacity = (typeof BODY_CAPACITIES)[number];
export type LifeDomain = (typeof LIFE_DOMAINS)[number];
export type LifeSupportPref = (typeof LIFE_SUPPORT_PREFS)[number];

/** Optional soft-launch survey pack (skippable). */
export interface SurveyAnswers {
  seasonLabel?: SeasonLabel;
  hardWindow?: HardWindow;
  healThemes?: HealTheme[];
  healMode?: HealMode;
  healEnergy?: HealEnergy;
  medLength?: MedLength;
  medExperience?: MedExperience;
  bodyModality?: BodyModality;
  bodyCapacity?: BodyCapacity;
  lifeDomains?: LifeDomain[];
  lifeLighter10?: string;
  lifeSupportPrefs?: LifeSupportPref[];
}

export interface OnboardingPayload {
  preferredName?: string;
  pillars: PillarId[];
  rhythm: CheckinRhythm;
  survey?: SurveyAnswers;
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function isCheckinRhythm(value: unknown): value is CheckinRhythm {
  return (
    typeof value === 'string' &&
    (CHECKIN_RHYTHMS as readonly string[]).includes(value)
  );
}

function parseMultiPick<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  max: number
): T[] | null {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? [raw]
      : null;
  if (!list || list.length < 1 || list.length > max) return null;
  const out: T[] = [];
  for (const entry of list) {
    if (!isOneOf(entry, allowed)) return null;
    if (!out.includes(entry)) out.push(entry);
  }
  return out.length ? out : null;
}

function parseSurveyAnswers(
  raw: unknown
): { ok: true; survey?: SurveyAnswers } | { ok: false; error: string } {
  if (raw == null) return { ok: true };
  if (typeof raw !== 'object') return { ok: false, error: 'invalid_survey' };

  const obj = raw as Record<string, unknown>;
  const survey: SurveyAnswers = {};

  if (obj.season_label != null) {
    if (!isOneOf(obj.season_label, SEASON_LABELS)) {
      return { ok: false, error: 'invalid_season_label' };
    }
    survey.seasonLabel = obj.season_label;
  }

  if (obj.hard_window != null) {
    if (!isOneOf(obj.hard_window, HARD_WINDOWS)) {
      return { ok: false, error: 'invalid_hard_window' };
    }
    survey.hardWindow = obj.hard_window;
  }

  if (obj.heal_theme != null) {
    const themes = parseMultiPick(obj.heal_theme, HEAL_THEMES, 2);
    if (!themes) return { ok: false, error: 'invalid_heal_theme' };
    survey.healThemes = themes;
  }

  if (obj.heal_mode != null) {
    if (!isOneOf(obj.heal_mode, HEAL_MODES)) {
      return { ok: false, error: 'invalid_heal_mode' };
    }
    survey.healMode = obj.heal_mode;
  }

  if (obj.heal_energy != null) {
    if (!isOneOf(obj.heal_energy, HEAL_ENERGIES)) {
      return { ok: false, error: 'invalid_heal_energy' };
    }
    survey.healEnergy = obj.heal_energy;
  }

  if (obj.med_length != null) {
    if (!isOneOf(obj.med_length, MED_LENGTHS)) {
      return { ok: false, error: 'invalid_med_length' };
    }
    survey.medLength = obj.med_length;
  }

  if (obj.med_experience != null) {
    if (!isOneOf(obj.med_experience, MED_EXPERIENCES)) {
      return { ok: false, error: 'invalid_med_experience' };
    }
    survey.medExperience = obj.med_experience;
  }

  if (obj.body_modality != null) {
    if (!isOneOf(obj.body_modality, BODY_MODALITIES)) {
      return { ok: false, error: 'invalid_body_modality' };
    }
    survey.bodyModality = obj.body_modality;
  }

  if (obj.body_capacity != null) {
    if (!isOneOf(obj.body_capacity, BODY_CAPACITIES)) {
      return { ok: false, error: 'invalid_body_capacity' };
    }
    survey.bodyCapacity = obj.body_capacity;
  }

  if (obj.life_domains != null) {
    const domains = parseMultiPick(obj.life_domains, LIFE_DOMAINS, 2);
    if (!domains) return { ok: false, error: 'invalid_life_domains' };
    survey.lifeDomains = domains;
  }

  if (obj.life_lighter_10 != null) {
    if (typeof obj.life_lighter_10 !== 'string') {
      return { ok: false, error: 'invalid_life_lighter_10' };
    }
    const trimmed = obj.life_lighter_10.trim().slice(0, 120);
    if (!trimmed) return { ok: false, error: 'invalid_life_lighter_10' };
    survey.lifeLighter10 = trimmed;
  }

  if (obj.life_support_pref != null) {
    const prefs = parseMultiPick(obj.life_support_pref, LIFE_SUPPORT_PREFS, 2);
    if (!prefs) return { ok: false, error: 'invalid_life_support_pref' };
    survey.lifeSupportPrefs = prefs;
  }

  if (
    !survey.seasonLabel &&
    !survey.hardWindow &&
    !survey.healThemes &&
    !survey.healMode &&
    !survey.healEnergy &&
    !survey.medLength &&
    !survey.medExperience &&
    !survey.bodyModality &&
    !survey.bodyCapacity &&
    !survey.lifeDomains &&
    !survey.lifeLighter10 &&
    !survey.lifeSupportPrefs
  ) {
    return { ok: true };
  }

  return { ok: true, survey };
}

export function parseOnboardingPayload(
  raw: unknown
): { ok: true; payload: OnboardingPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'invalid_body' };
  }
  const obj = raw as Record<string, unknown>;

  let preferredName: string | undefined;
  if (typeof obj.preferred_name === 'string') {
    const trimmed = obj.preferred_name.trim().slice(0, 40);
    if (trimmed) preferredName = trimmed;
  } else if (obj.preferred_name != null && obj.preferred_name !== '') {
    return { ok: false, error: 'invalid_preferred_name' };
  }

  const pillarsRaw = obj.pillars;
  if (!Array.isArray(pillarsRaw) || pillarsRaw.length < 1 || pillarsRaw.length > 2) {
    return { ok: false, error: 'pillars_required' };
  }

  const pillars: PillarId[] = [];
  for (const entry of pillarsRaw) {
    if (!isPillarId(entry)) {
      return { ok: false, error: 'invalid_pillar' };
    }
    if (!pillars.includes(entry)) {
      pillars.push(entry);
    }
  }
  if (pillars.length < 1) {
    return { ok: false, error: 'pillars_required' };
  }

  if (!isCheckinRhythm(obj.rhythm)) {
    return { ok: false, error: 'rhythm_required' };
  }

  const surveyParsed = parseSurveyAnswers(obj.survey);
  if (!surveyParsed.ok) {
    return { ok: false, error: surveyParsed.error };
  }

  return {
    ok: true,
    payload: {
      preferredName,
      pillars,
      rhythm: obj.rhythm,
      survey: surveyParsed.survey,
    },
  };
}

function focusSummary(pillars: PillarId[], rhythm: CheckinRhythm): string {
  const pillarPart = pillars.map((p) => PILLAR_LABELS[p]).join(' and ');
  return `Starting focus: ${pillarPart}. Check-in rhythm: ${RHYTHM_LABELS[rhythm]}.`;
}

function surveyFactRows(
  survey: SurveyAnswers | undefined
): Array<{ key: string; value: string }> {
  if (!survey) return [];
  const rows: Array<{ key: string; value: string }> = [];
  if (survey.seasonLabel) {
    rows.push({ key: 'season.label', value: survey.seasonLabel });
  }
  if (survey.hardWindow) {
    rows.push({ key: 'rhythm.hard_window', value: survey.hardWindow });
  }
  if (survey.healThemes?.length) {
    rows.push({ key: 'heal.theme', value: survey.healThemes.join(' · ') });
  }
  if (survey.healMode) {
    rows.push({ key: 'heal.mode', value: survey.healMode });
  }
  if (survey.healEnergy) {
    rows.push({ key: 'heal.energy', value: survey.healEnergy });
  }
  if (survey.medLength) {
    rows.push({ key: 'med.length_min', value: survey.medLength });
  }
  if (survey.medExperience) {
    rows.push({ key: 'med.experience', value: survey.medExperience });
  }
  if (survey.bodyModality) {
    rows.push({ key: 'body.modality', value: survey.bodyModality });
  }
  if (survey.bodyCapacity) {
    rows.push({ key: 'body.capacity', value: survey.bodyCapacity });
  }
  if (survey.lifeDomains?.length) {
    rows.push({ key: 'life.domains', value: survey.lifeDomains.join(' · ') });
  }
  if (survey.lifeLighter10) {
    rows.push({ key: 'life.lighter_10', value: survey.lifeLighter10 });
  }
  if (survey.lifeSupportPrefs?.length) {
    rows.push({
      key: 'life.support_pref',
      value: survey.lifeSupportPrefs.join(' · '),
    });
  }
  return rows;
}

/**
 * Seed ~1–2 conversational facts + prefs from onboarding; mark complete.
 * Optional survey pack writes season / hard_window / heal.* / med.* / body.* / life.* facts.
 * Always writes user_facts (works under CHAT_DEV_BYPASS). Updates users row when present.
 */
export async function persistOnboarding(
  db: D1Database,
  userId: string,
  payload: OnboardingPayload
): Promise<{
  wave: Awaited<ReturnType<typeof upsertWavePrefs>>;
  wave_row: WaveRecord | null;
  today: DayPlanRecord | null;
  facts: Array<{ key: string; value: string }>;
  onboarding_complete: boolean;
}> {
  const primary = payload.pillars[0]!;
  const secondary = payload.pillars[1];

  // Seed facts for chat injection (1–2): focus always; name or rhythm as the other.
  const seedFacts: Array<{ key: string; value: string }> = [
    {
      key: 'onboarding.focus',
      value: focusSummary(payload.pillars, payload.rhythm),
    },
  ];
  if (payload.preferredName) {
    seedFacts.unshift({
      key: 'profile.preferred_name',
      value: payload.preferredName,
    });
  } else {
    seedFacts.push({
      key: 'rhythm.checkin',
      value: payload.rhythm,
    });
  }

  await upsertMemoryFacts(db, userId, seedFacts, 'manual');

  // Prefer-key for later Waves/nudges even when name took the second seed slot
  if (payload.preferredName) {
    await upsertFact(db, userId, 'rhythm.checkin', payload.rhythm, 'manual');
  }

  if (secondary) {
    await upsertFact(db, userId, 'pillar.secondary', secondary, 'wave');
  }

  const surveyFacts = surveyFactRows(payload.survey);
  if (surveyFacts.length) {
    await upsertMemoryFacts(db, userId, surveyFacts, 'manual');
  }

  const wave = await upsertWavePrefs(db, userId, {
    pillar: primary,
    label: defaultWaveLabel(primary),
    week: 1,
    status: 'starting',
  });

  await upsertFact(db, userId, 'onboarding.complete', '1', 'manual');
  await completeOnboarding(db, userId);

  let waveRow: WaveRecord | null = null;
  let today: DayPlanRecord | null = null;
  try {
    const ensured = await ensureFirstWave(db, userId, {
      pillars: payload.pillars,
      generateToday: true,
    });
    waveRow = ensured.wave;
    today = ensured.today;
  } catch (waveErr) {
    // Prefs still saved; UI can POST /api/wave after migration 0005.
    console.error('ensure First Wave after onboarding failed', waveErr);
  }

  const facts = [
    ...seedFacts,
    ...(payload.preferredName
      ? [{ key: 'rhythm.checkin', value: payload.rhythm }]
      : []),
    ...(secondary ? [{ key: 'pillar.secondary', value: secondary }] : []),
    ...surveyFacts,
    { key: 'onboarding.complete', value: '1' },
  ];

  return {
    wave,
    wave_row: waveRow,
    today,
    facts,
    onboarding_complete: true,
  };
}

export { PILLARS };
