/**
 * GET /api/wave/today.ics — text/calendar export for today’s day_plan
 * (+ soft Wave check-in when rhythm is scheduled).
 * Auth: same as chat — Clerk Bearer or CHAT_DEV_BYPASS.
 */

import { resolveChatSession } from '../../lib/auth';
import { listUserFacts } from '../../lib/memory';
import { buildTodayIcs, icsFilename, type IcsHints } from '../../lib/ics';
import {
  ensureTodayPlan,
  getActiveWave,
  planHintsFromFacts,
} from '../../lib/waves';
import { jsonResponse } from '../../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

const MIGRATE_HINT =
  'Run npm run db:migrate:waves:local (migration 0005) after db:migrate:local.';

function hintsWithCheckin(
  facts: Array<{ fact_key: string; fact_value: string }>
): IcsHints {
  const base = planHintsFromFacts(facts);
  const checkin = facts.find((f) => f.fact_key === 'rhythm.checkin')?.fact_value;
  return checkin ? { ...base, checkinRhythm: checkin } : base;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  try {
    let wave = await getActiveWave(env.DB, session.userId);
    if (!wave) {
      return jsonResponse(
        {
          ok: false,
          error: 'no_wave',
          hint: 'Start a Wave first (POST /api/wave) or finish onboarding.',
        },
        404
      );
    }

    const today = await ensureTodayPlan(env.DB, session.userId, wave, false);
    if (!today.items.length) {
      return jsonResponse(
        {
          ok: false,
          error: 'empty_plan',
          hint: 'Refresh today’s plan (POST /api/wave/today with regenerate), then export again.',
        },
        404
      );
    }

    const facts = await listUserFacts(env.DB, session.userId);
    const hints = hintsWithCheckin(facts);
    const body = buildTodayIcs({ wave, today, hints });
    const filename = icsFilename(today.plan_date);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
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
    console.error('wave today.ics failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
