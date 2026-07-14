/**
 * POST /api/wave/today — generate/update today’s day plan (canned stub JSON).
 * Body options:
 *   { regenerate?: boolean } — rebuild items from pillar templates
 *   { item_id: string, done: boolean } — mark a tiny action done / undone (shame-free)
 */

import { resolveChatSession } from '../../lib/auth';
import {
  ensureFirstWave,
  ensureTodayPlan,
  getActiveWave,
  markDayPlanItem,
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
    // empty body OK for “ensure today”
    raw = {};
  }

  if (!raw || typeof raw !== 'object') {
    return jsonResponse({ ok: false, error: 'invalid_body' }, 400);
  }

  const obj = raw as Record<string, unknown>;
  const regenerate = obj.regenerate === true;
  const hasMark =
    typeof obj.item_id === 'string' &&
    obj.item_id.trim() &&
    typeof obj.done === 'boolean';

  try {
    let wave = await getActiveWave(env.DB, session.userId);
    if (!wave) {
      const ensured = await ensureFirstWave(env.DB, session.userId, {
        generateToday: true,
      });
      wave = ensured.wave;
      if (!hasMark && !regenerate) {
        return jsonResponse({
          ok: true,
          user_id: session.userId,
          wave: serializeWave(wave),
          today: ensured.today ? serializeDayPlan(ensured.today) : null,
          created_wave: ensured.created,
        });
      }
    }

    if (hasMark) {
      const itemId = (obj.item_id as string).trim().slice(0, 32);
      const plan = await markDayPlanItem(
        env.DB,
        session.userId,
        itemId,
        obj.done as boolean
      );
      if (!plan) {
        return jsonResponse(
          {
            ok: false,
            error: 'item_not_found',
            hint: 'Generate today’s plan first (POST /api/wave/today).',
          },
          404
        );
      }
      return jsonResponse({
        ok: true,
        user_id: session.userId,
        wave: serializeWave(wave),
        today: serializeDayPlan(plan),
      });
    }

    const today = await ensureTodayPlan(
      env.DB,
      session.userId,
      wave,
      regenerate
    );

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      wave: serializeWave(wave),
      today: serializeDayPlan(today),
      regenerated: regenerate,
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
    console.error('wave today failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
