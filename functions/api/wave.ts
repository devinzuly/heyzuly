/**
 * GET /api/wave — current active Wave + today’s day plan
 *   (+ completed celebration when no active Wave).
 * POST /api/wave — start/ensure First Wave from onboarding prefs (creates day plan stub).
 */

import { resolveChatSession } from '../lib/auth';
import { isPillarId, type PillarId } from '../lib/memory';
import {
  canExplicitlyCompleteWave,
  ensureFirstWave,
  loadWaveContextBundle,
  serializeCelebration,
  serializeDayPlan,
  serializeWave,
} from '../lib/waves';
import { jsonResponse } from '../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

const MIGRATE_HINT =
  'Run npm run db:migrate:waves:local (migration 0005) after db:migrate:local.';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  try {
    const { wave, today, completed } = await loadWaveContextBundle(
      env.DB,
      session.userId
    );
    return jsonResponse({
      ok: true,
      user_id: session.userId,
      wave: wave ? serializeWave(wave) : null,
      today: today ? serializeDayPlan(today) : null,
      completed_wave: completed ? serializeWave(completed) : null,
      celebration:
        completed && !wave ? serializeCelebration(completed) : null,
      can_complete: wave ? canExplicitlyCompleteWave(wave) : false,
    });
  } catch (err) {
    console.error('wave get failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  let raw: unknown = {};
  const contentType = request.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      raw = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
    }
  }

  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  let pillars: PillarId[] | undefined;
  if (Array.isArray(obj.pillars)) {
    pillars = [];
    for (const entry of obj.pillars) {
      if (!isPillarId(entry)) {
        return jsonResponse({ ok: false, error: 'invalid_pillar' }, 400);
      }
      if (!pillars.includes(entry)) pillars.push(entry);
    }
    if (!pillars.length || pillars.length > 2) {
      return jsonResponse({ ok: false, error: 'pillars_required' }, 400);
    }
  }

  try {
    const result = await ensureFirstWave(env.DB, session.userId, {
      pillars,
      generateToday: obj.generate_today !== false,
    });

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      created: result.created,
      wave: serializeWave(result.wave),
      today: result.today ? serializeDayPlan(result.today) : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'wave_prefs_missing') {
      return jsonResponse(
        {
          ok: false,
          error: 'wave_prefs_missing',
          hint: 'Complete onboarding or POST pillars for First Wave.',
        },
        400
      );
    }
    console.error('wave ensure failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
