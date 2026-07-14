/**
 * POST /api/wave/build-from-talk — propose today’s tiny actions from chat.
 * Does not persist unless confirm=true + items (or omit items to confirm proposal).
 *
 * Body:
 *   { messages?: [{role,content}], summary?: string, pillar?: PillarId,
 *     confirm?: boolean, items?: DayPlanItem[] }
 *
 * Propose (default): returns { ok, proposed: { items, source, cap }, wave, today }
 * Confirm: writes to day_plans via replaceTodayItems; returns { ok, today, wave, confirmed: true }
 */

import { resolveChatSession } from '../../lib/auth';
import { proposeBuildFromTalk, type TalkMessage } from '../../lib/buildFromTalk';
import { isPillarId, listUserFacts, type PillarId } from '../../lib/memory';
import { listRecentMessages } from '../../lib/messages';
import {
  ensureFirstWave,
  getActiveWave,
  normalizeDayPlanItems,
  planHintsFromFacts,
  replaceTodayItems,
  serializeDayPlan,
  serializeWave,
} from '../../lib/waves';
import { jsonResponse } from '../../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

const MIGRATE_HINT =
  'Run npm run db:migrate:waves:local (migration 0005) after db:migrate:local.';

function parseMessages(raw: unknown): TalkMessage[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: TalkMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    const role = obj.role;
    const content = typeof obj.content === 'string' ? obj.content.trim() : '';
    if (
      (role === 'user' || role === 'assistant' || role === 'system') &&
      content
    ) {
      out.push({ role, content: content.slice(0, 2000) });
    }
    if (out.length >= 20) break;
  }
  return out.length ? out : undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  if (!raw || typeof raw !== 'object') {
    return jsonResponse({ ok: false, error: 'invalid_body' }, 400);
  }

  const obj = raw as Record<string, unknown>;
  const confirm = obj.confirm === true;
  const summary =
    typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 2000) : '';
  let messages = parseMessages(obj.messages);
  const bodyPillar = isPillarId(obj.pillar) ? (obj.pillar as PillarId) : null;

  try {
    let wave = await getActiveWave(env.DB, session.userId);
    if (!wave) {
      const ensured = await ensureFirstWave(env.DB, session.userId, {
        generateToday: false,
      });
      wave = ensured.wave;
    }

    const factRows = await listUserFacts(env.DB, session.userId);
    const hints = planHintsFromFacts(factRows);
    const primary = bodyPillar ?? wave.primary_pillar;
    const secondary =
      wave.pillars.find((p) => p !== primary) ?? null;

    // Confirm path: persist edited items (or re-propose then save if items omitted).
    if (confirm) {
      let items = normalizeDayPlanItems(obj.items, primary, 3);
      if (!items.length) {
        if (!messages?.length && !summary) {
          const recent = await listRecentMessages(env.DB, session.userId, 12);
          messages = recent
            .slice()
            .reverse()
            .map((m) => ({
              role: m.role as TalkMessage['role'],
              content: m.content,
            }));
        }
        const proposal = await proposeBuildFromTalk(env, {
          messages,
          summary: summary || undefined,
          pillar: primary,
          secondary,
          hints,
          week: wave.week,
        });
        items = proposal.items;
      }

      const today = await replaceTodayItems(
        env.DB,
        session.userId,
        wave,
        items
      );
      return jsonResponse({
        ok: true,
        user_id: session.userId,
        confirmed: true,
        wave: serializeWave(wave),
        today: serializeDayPlan(today),
        proposed: {
          items: today.items,
          source: 'confirmed',
          cap: today.items.length,
        },
      });
    }

    // Propose only — load recent chat if client didn’t send messages.
    if (!messages?.length && !summary) {
      const recent = await listRecentMessages(env.DB, session.userId, 12);
      messages = recent
        .slice()
        .reverse()
        .map((m) => ({
          role: m.role as TalkMessage['role'],
          content: m.content,
        }));
    }

    if (!messages?.length && !summary) {
      return jsonResponse(
        {
          ok: false,
          error: 'nothing_to_build',
          hint: 'Send recent messages, a short summary, or talk with Zuly first.',
        },
        400
      );
    }

    const proposal = await proposeBuildFromTalk(env, {
      messages,
      summary: summary || undefined,
      pillar: primary,
      secondary,
      hints,
      week: wave.week,
    });

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      confirmed: false,
      wave: serializeWave(wave),
      today: null,
      proposed: {
        items: proposal.items,
        source: proposal.source,
        cap: proposal.cap,
        summary_used: proposal.summary_used,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'wave_prefs_missing') {
      return jsonResponse(
        {
          ok: false,
          error: 'wave_prefs_missing',
          hint: 'Complete onboarding or POST /api/wave with pillars.',
        },
        400
      );
    }
    if (message === 'items_empty') {
      return jsonResponse(
        {
          ok: false,
          error: 'items_empty',
          hint: 'Add at least one tiny action before confirming.',
        },
        400
      );
    }
    console.error('build-from-talk failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
