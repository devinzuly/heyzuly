/**
 * First Wave curricula — 4-week templates per primary pillar.
 * Soft-launch beachhead: Self-healing (CBT-lite + expressive writing).
 * Growth language, shame-free, evidence-informed wellness practices — not clinical.
 */

import type { PillarId } from './memory';

export type WaveWeekNumber = 1 | 2 | 3 | 4;

export interface WaveWeekTemplate {
  week: WaveWeekNumber;
  /** Short theme title shown in Grow + chat context. */
  theme: string;
  /** One-sentence focus blurb. */
  focus: string;
  /** Soft check-in prompt for the week (Zuly / Grow). */
  checkInPrompt: string;
  /** Sample day-plan seeds — tiny, doable actions. */
  seeds: string[];
}

export interface WaveCurriculum {
  pillar: PillarId;
  label: string;
  blurb: string;
  weeks: [WaveWeekTemplate, WaveWeekTemplate, WaveWeekTemplate, WaveWeekTemplate];
}

export const WAVE_TEMPLATE_WEEKS = 4 as const;

/** Self-healing First Wave — CBT-flavored notice/reframe + expressive writing. */
const SELF_HEALING: WaveCurriculum = {
  pillar: 'self-healing',
  label: 'First Wave · Self-healing',
  blurb:
    'Four weeks of notice → soft reframe → short writing → one valued next step. Practice, not treatment.',
  weeks: [
    {
      week: 1,
      theme: 'Notice what’s here',
      focus:
        'Name thoughts and feelings without fixing them. Awareness is the first kindness.',
      checkInPrompt:
        'What showed up loudest this week — and can you name it in one honest sentence?',
      seeds: [
        'Write one true sentence about how today feels — no editing.',
        'Catch one harsh thought; label it “a thought,” then leave it there.',
        'Name one sensation in your body for ten seconds — curiosity, not judgment.',
        'List three facts about today that aren’t the whole story.',
      ],
    },
    {
      week: 2,
      theme: 'Soften the story',
      focus:
        'Practice a kinder reframe next to the honest one — same truth, less sting.',
      checkInPrompt:
        'Which critical line showed up — and what’s a softer, still-honest twin?',
      seeds: [
        'Rewrite one harsh self-line softer — keep the honesty, drop the slap.',
        'Ask: “What would I say to a friend in this exact moment?” Write that.',
        'Pick one “always/never” thought and shrink it to “sometimes today.”',
        'Name the feeling under the critic (tired, scared, lonely) — then stop.',
      ],
    },
    {
      week: 3,
      theme: 'Write it out',
      focus:
        'Short expressive writing to close loops — timed, private, no essay pressure.',
      checkInPrompt:
        'Did a short write help anything unstick — even a little — this week?',
      seeds: [
        'Timed write (3 minutes): what’s unfinished in your mind — then put the pen down.',
        'Three bullets only: what weighed on you, what helped, what can wait.',
        'Write what you wish you’d said once — decide later if anything needs saying.',
        'Close a small loop on paper: one worry → one kinder next line → done.',
      ],
    },
    {
      week: 4,
      theme: 'Keep what works',
      focus:
        'Pick one practice to carry forward and one tiny valued action — Wave bends, you keep growing.',
      checkInPrompt:
        'Which tiny practice do you want to keep after this Wave — and what’s one next step?',
      seeds: [
        'Choose one Week 1–3 move you’ll keep; do a 60-second version today.',
        'Do one valued action that matches how you want to feel (two minutes max).',
        'Write a one-line “permission slip” for imperfect days — read it once.',
        'Thank yourself for showing up messy; name one thing that got easier.',
      ],
    },
  ],
};

/** Meditation — MBSR-inspired tiny sits; not a certified course. */
const MEDITATION: WaveCurriculum = {
  pillar: 'meditation',
  label: 'First Wave · Meditation',
  blurb:
    'Short keepable sits that fit a real day — arrive, return, feel, carry into transitions.',
  weeks: [
    {
      week: 1,
      theme: 'Arrive',
      focus: 'Find a tiny anchor — breath or feet — that fits even a messy morning.',
      checkInPrompt:
        'Did a short arrive practice help you land even once this week?',
      seeds: [
        'Three slow breaths before you open anything important.',
        'Feel both feet on the floor for three breaths — that’s the practice.',
        'Sit still for one minute — no fixing, just noticing you’re here.',
        'Two breaths at a doorway — in for 4, out for 6.',
      ],
    },
    {
      week: 2,
      theme: 'Return',
      focus:
        'When the mind wanders (it will), name it once and come back — that is the work.',
      checkInPrompt:
        'How many times did you leave and return — and was returning kinder this week?',
      seeds: [
        'Two quiet minutes: when attention drifts, whisper “wandering” and return once.',
        'Count five breaths; if you lose count, start again without drama.',
        'Notice one sound, then return to breath — soft landing, not force.',
        'Sit for three minutes; success = noticing, not empty mind.',
      ],
    },
    {
      week: 3,
      theme: 'Feel the body',
      focus: 'Body-scan lite — curious attention from feet to face, no fixing.',
      checkInPrompt:
        'What showed up in the body this week when you paused to feel?',
      seeds: [
        'Scan from feet to jaw for ninety seconds — name tightness without changing it.',
        'Place a hand on your chest or belly; follow three breaths there.',
        'Unclench one spot (jaw, shoulders, fists) and notice what remains.',
        'Body check: warm / cool / tense / ease — one word is enough.',
      ],
    },
    {
      week: 4,
      theme: 'Carry it with you',
      focus: 'Move practice into the day — doorways, waits, and soft resets.',
      checkInPrompt:
        'Where did a micro-practice fit into real life this week?',
      seeds: [
        'One transition reset: before the next meeting or phone pick-up, three breaths.',
        'Waiting-in-line practice: feel feet, soften shoulders, done.',
        'Evening close: two minutes of quiet before screens if you can; skip is fine.',
        'Choose one “cue” you’ll keep (doorway, kettle, seatbelt) for a tiny sit.',
      ],
    },
  ],
};

/** Body — gentle progressive movement; capacity- and rest-aware. */
const BODY: WaveCurriculum = {
  pillar: 'body',
  label: 'First Wave · Body',
  blurb:
    'Gentle progressive movement paced to capacity — no punish workouts, weigh-ins, or grind.',
  weeks: [
    {
      week: 1,
      theme: 'Gentle return',
      focus: 'Reacquaint with movement that feels like care, not correction.',
      checkInPrompt:
        'What movement felt kind enough to repeat — even for a minute?',
      seeds: [
        'Stretch shoulders or hips for one minute — stop when it softens.',
        'Walk for three minutes — soft pace, no step-count theater.',
        'Drink a glass of water like it counts as care, not a chore.',
        'Stand and sway or roll shoulders for sixty seconds — that’s movement.',
      ],
    },
    {
      week: 2,
      theme: 'Show up small',
      focus: 'Consistency without grind — same tiny move, different day, still counts.',
      checkInPrompt:
        'Did a small repeatable move stick more than a big plan this week?',
      seeds: [
        'Repeat yesterday’s kindest move for two minutes — or half of it.',
        'Shoes by the door (or mat out) as a cue — then one short loop.',
        'Stack movement onto something you already do (coffee → stretch).',
        'If energy dips: jaw unclench + shoulders drop — recovery counts.',
      ],
    },
    {
      week: 3,
      theme: 'Tiny progress',
      focus:
        'Nudge load gently — one more minute or one easier set — rest-aware always.',
      checkInPrompt:
        'Where did you add a little challenge without turning it into punishment?',
      seeds: [
        'Add one minute to a walk or stretch you already like — or stay the same.',
        'One light strength set: 5 slow sit-to-stands or wall pushes — stop early if needed.',
        'Choose mobility: neck or wrists, two gentle moves, then done.',
        'Rest-first option: still for ninety seconds + water — valid progress day.',
      ],
    },
    {
      week: 4,
      theme: 'Sustain with rest',
      focus: 'Keep a sustainable rhythm — rest days are part of the Wave, not absence.',
      checkInPrompt:
        'What’s your keepable body rhythm — including rest — after this Wave?',
      seeds: [
        'Write your “good enough” body day in one line — do a version of it once.',
        'Plan one rest or recovery pocket this week without apology.',
        'Pick the least punish-y option today: walk, stretch, or rest.',
        'Thank your body for what it did; name one cue you’ll keep.',
      ],
    },
  ],
};

/** Life guidance — tiny habit / behavior-design moves; not legal/financial advice. */
const LIFE: WaveCurriculum = {
  pillar: 'life-guidance',
  label: 'First Wave · Life guidance',
  blurb:
    'Name what’s heavy, shrink the next step, ask for support, keep one clear thread.',
  weeks: [
    {
      week: 1,
      theme: 'Name the weight',
      focus: 'Get honest about what’s crowding life — without solving everything yet.',
      checkInPrompt:
        'What’s the clearest name for what’s been heavy — and can it fit in one sentence?',
      seeds: [
        'Write the one domain that’s loudest (work, home, money-feel, people).',
        'Circle what can wait vs what needs a next step — today only names it.',
        'Clear one tiny clutter pile — five minutes, then stop.',
        'Say out loud (or to Zuly) what’s taking mental bandwidth — short is fine.',
      ],
    },
    {
      week: 2,
      theme: 'Shrink the step',
      focus: 'Behavior design: one friction drop or implementation intention, not a life overhaul.',
      checkInPrompt:
        'What tiny experiment made something 10% lighter?',
      seeds: [
        'Pick one small next step for something weighing on you — do only that.',
        'Prep one cue for tomorrow (calendar block, bag by the door, glass of water).',
        'Reduce one friction: unsubscribe, mute, or move a task two minutes earlier.',
        'If–then: “If it’s 7pm, then I do X for two minutes” — try once.',
      ],
    },
    {
      week: 3,
      theme: 'Support & edges',
      focus: 'Ask for help or hold a soft boundary — connection without over-explaining.',
      checkInPrompt:
        'Where did support or a boundary make the week more livable?',
      seeds: [
        'Send a kind or clarifying note — short is fine.',
        'Protect one work or rest boundary for ten minutes (or leave one thing unread).',
        'Ask one person for a specific tiny favor — or thank someone who helps you show up.',
        'Choose space or reconnect for five minutes — your call, no guilt.',
      ],
    },
    {
      week: 4,
      theme: 'Keep one thread',
      focus: 'Leave with one clear habit or decision thread — not a reinvention plan.',
      checkInPrompt:
        'Which one thread do you want to keep when this Wave ends?',
      seeds: [
        'Name one habit or boundary you’ll keep; schedule the next tiny instance.',
        'Write a one-line “season intention” — how you want life to feel, not a to-do list.',
        'Close one open loop that takes under five minutes — leave the rest.',
        'Celebrate a messy show-up; note what got easier without reinventing everything.',
      ],
    },
  ],
};

const BY_PILLAR: Record<PillarId, WaveCurriculum> = {
  'self-healing': SELF_HEALING,
  meditation: MEDITATION,
  body: BODY,
  'life-guidance': LIFE,
};

export function getWaveCurriculum(pillar: PillarId): WaveCurriculum {
  return BY_PILLAR[pillar] ?? SELF_HEALING;
}

export function clampWaveWeek(week: number): WaveWeekNumber {
  const n = Math.floor(Number(week) || 1);
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

export function getWeekTemplate(
  pillar: PillarId,
  week: number
): WaveWeekTemplate {
  const curriculum = getWaveCurriculum(pillar);
  return curriculum.weeks[clampWaveWeek(week) - 1]!;
}

/**
 * Week index from calendar time since Wave started_at.
 * Days 0–6 → week 1, 7–13 → week 2, … clamped to 1–4.
 */
export function computeWaveWeek(
  startedAt: string,
  now: Date = new Date()
): WaveWeekNumber {
  const raw = startedAt.trim();
  const iso = raw.includes('T')
    ? raw.replace(' ', 'T')
    : `${raw.replace(' ', 'T')}${raw.includes(':') ? '' : 'T00:00:00'}`;
  const start = new Date(
    /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}.000Z`
  );
  if (Number.isNaN(start.getTime())) return 1;
  const ms = now.getTime() - start.getTime();
  if (ms < 0) return 1;
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return clampWaveWeek(Math.floor(days / 7) + 1);
}

/** Seed pool for canned day plans — week curriculum first. */
export function weekSeedPool(pillar: PillarId, week: number): string[] {
  return [...getWeekTemplate(pillar, week).seeds];
}
