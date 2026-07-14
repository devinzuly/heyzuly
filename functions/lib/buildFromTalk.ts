/**
 * Phase 5b — Talk → build day (structured JSON).
 * Stub: keyword templates from recent chat + survey facts.
 * Optional Anthropic JSON-only extract when ANTHROPIC_API_KEY is set (nice-to-have).
 */

import {
  buildTodayItems,
  dayPlanItemCap,
  normalizeDayPlanItems,
  type DayPlanItem,
  type PlanFactHints,
} from './waves';
import { isPillarId, type PillarId } from './memory';

export interface TalkMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type BuildFromTalkSource = 'stub' | 'anthropic';

export interface BuildFromTalkResult {
  items: DayPlanItem[];
  source: BuildFromTalkSource;
  cap: number;
  summary_used: string;
}

/** Soft offer when the user already sounds ready for a tiny day plan. */
export function looksPlanReady(text: string): boolean {
  return /\b(for today|today'?s plan|build (a |my )?day|plan (my|the)? ?day|tiny (step|action)s?|what should i do|make a plan|map (this|it)|one small step|that'?s enough for today)\b/i.test(
    text
  );
}

type KeywordRule = {
  match: RegExp;
  pillar: PillarId;
  text: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    match: /\b(breath|breathe|anxious|anxiety|scatter|overwhelm|calm|ground)\b/i,
    pillar: 'meditation',
    text: 'Three slow breaths before the next hard thing — then stop.',
  },
  {
    match: /\b(meditat|sit still|quiet|silence|mindful)\b/i,
    pillar: 'meditation',
    text: 'Sit still for two minutes — notice, don’t fix.',
  },
  {
    match: /\b(write|journal|notebook|harsh thought|rumina|critic)\b/i,
    pillar: 'self-healing',
    text: 'Write one true sentence about how today feels — no fixing required.',
  },
  {
    match: /\b(feel|emotion|heavy|weigh|lonely|guilt|shame|grief)\b/i,
    pillar: 'self-healing',
    text: 'Name one feeling out loud (or typed) without explaining it away.',
  },
  {
    match: /\b(walk|stretch|body|shoulders|hips|move|tired|energy|water)\b/i,
    pillar: 'body',
    text: 'Gently stretch or walk for two minutes — care, not a workout.',
  },
  {
    match: /\b(sleep|rest|nap|bed)\b/i,
    pillar: 'body',
    text: 'Do one soft wind-down: lights lower, phone face-down for five minutes.',
  },
  {
    match: /\b(work|deadline|email|task|clutter|decision|boundary|family|partner)\b/i,
    pillar: 'life-guidance',
    text: 'Pick one two-minute next step on what’s weighing on you — then pause.',
  },
  {
    match: /\b(friend|thank|kind|support|text|message)\b/i,
    pillar: 'life-guidance',
    text: 'Send one kind note (or thank-you) — short is enough.',
  },
];

function combineTalkText(
  messages: TalkMessage[] | undefined,
  summary: string | undefined
): string {
  const bits: string[] = [];
  if (summary?.trim()) bits.push(summary.trim());
  if (messages?.length) {
    for (const m of messages.slice(-8)) {
      if ((m.role === 'user' || m.role === 'assistant') && m.content?.trim()) {
        bits.push(m.content.trim());
      }
    }
  }
  return bits.join('\n').slice(0, 4000);
}

function lastUserText(messages: TalkMessage[] | undefined, summary?: string): string {
  if (messages?.length) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      if (m.role === 'user' && m.content?.trim()) return m.content.trim();
    }
  }
  return summary?.trim() ?? '';
}

function keywordItems(
  text: string,
  preferredPillar: PillarId,
  cap: number
): DayPlanItem[] {
  const matched: DayPlanItem[] = [];
  const seen = new Set<string>();
  for (const rule of KEYWORD_RULES) {
    if (!rule.match.test(text)) continue;
    const key = rule.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    matched.push({
      id: `t${matched.length + 1}`,
      text: rule.text,
      pillar: preferredPillar || rule.pillar,
      done: false,
    });
    // Prefer preferred pillar’s rule pillar when it matches; allow cross-pillar if few
    if (matched.length >= cap) break;
  }

  // Prefer items whose rule pillar matches preferred when we over-fetched.
  const preferred = matched.filter((i) => {
    const rule = KEYWORD_RULES.find((r) => r.text === i.text);
    return !rule || rule.pillar === preferredPillar;
  });
  const rest = matched.filter((i) => !preferred.includes(i));
  return [...preferred, ...rest].slice(0, cap).map((item, i) => ({
    ...item,
    id: `t${i + 1}`,
    pillar: preferredPillar,
  }));
}

/** Deterministic stub proposal — no LLM required. */
export function buildFromTalkStub(opts: {
  messages?: TalkMessage[];
  summary?: string;
  pillar: PillarId;
  secondary?: PillarId | null;
  hints?: PlanFactHints;
  seed?: number;
  week?: number;
}): BuildFromTalkResult {
  const hints = opts.hints ?? {};
  const hasSecondary = Boolean(opts.secondary && opts.secondary !== opts.pillar);
  const cap = dayPlanItemCap(hints, hasSecondary);
  const blob = combineTalkText(opts.messages, opts.summary);
  const focus = lastUserText(opts.messages, opts.summary) || blob;

  const fromKeywords = keywordItems(focus || blob, opts.pillar, cap);
  const canned = buildTodayItems(
    opts.pillar,
    opts.secondary ?? null,
    opts.seed ?? focus.length,
    hints,
    opts.week ?? 1
  );

  const drafts: DayPlanItem[] = [];
  const seen = new Set<string>();
  for (const item of [...fromKeywords, ...canned]) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({
      ...item,
      pillar: isPillarId(item.pillar) ? item.pillar : opts.pillar,
      done: false,
    });
    if (drafts.length >= cap) break;
  }

  const items = normalizeDayPlanItems(drafts, opts.pillar, cap);
  return {
    items: items.length
      ? items
      : [
          {
            id: 't1',
            text: 'One tiny action that would make today 5% softer — then stop.',
            pillar: opts.pillar,
            done: false,
          },
        ],
    source: 'stub',
    cap,
    summary_used: (focus || blob).slice(0, 280),
  };
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('no_json');
  }
}

async function tryAnthropicExtract(
  apiKey: string,
  opts: {
    summary: string;
    pillar: PillarId;
    cap: number;
    hints: PlanFactHints;
  }
): Promise<DayPlanItem[] | null> {
  const constraintBits: string[] = [];
  if (opts.hints.healEnergy) constraintBits.push(`heal.energy=${opts.hints.healEnergy}`);
  if (opts.hints.hardWindow) constraintBits.push(`hard_window=${opts.hints.hardWindow}`);
  if (opts.hints.healMode) constraintBits.push(`heal.mode=${opts.hints.healMode}`);

  const prompt = `Return ONLY JSON (no markdown) shaped as:
{"items":[{"id":"t1","text":"...","pillar":"${opts.pillar}","done":false}]}
Rules: 1–${opts.cap} tiny wellness actions (under 120 chars each). Growth language, no shame/streaks/grind. Pillar must be one of: meditation, self-healing, body, life-guidance. Prefer pillar=${opts.pillar}.
${constraintBits.length ? `Constraints: ${constraintBits.join(' · ')}` : ''}
Talk/summary:
${opts.summary.slice(0, 1500)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
  if (!text.trim()) return null;

  const parsed = extractJsonObject(text) as { items?: unknown };
  const items = normalizeDayPlanItems(parsed.items, opts.pillar, opts.cap);
  return items.length ? items : null;
}

/**
 * Propose a day plan from talk. Stub always works; Anthropic optional.
 */
export async function proposeBuildFromTalk(
  env: { ANTHROPIC_API_KEY?: string },
  opts: {
    messages?: TalkMessage[];
    summary?: string;
    pillar: PillarId;
    secondary?: PillarId | null;
    hints?: PlanFactHints;
    seed?: number;
    week?: number;
    preferAnthropic?: boolean;
  }
): Promise<BuildFromTalkResult> {
  const stub = buildFromTalkStub(opts);
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key || opts.preferAnthropic === false) {
    return stub;
  }

  try {
    const anthropicItems = await tryAnthropicExtract(key, {
      summary: stub.summary_used || combineTalkText(opts.messages, opts.summary),
      pillar: opts.pillar,
      cap: stub.cap,
      hints: opts.hints ?? {},
    });
    if (anthropicItems?.length) {
      return {
        items: anthropicItems,
        source: 'anthropic',
        cap: stub.cap,
        summary_used: stub.summary_used,
      };
    }
  } catch {
    // Fall through to stub — Anthropic is nice-to-have.
  }
  return stub;
}
