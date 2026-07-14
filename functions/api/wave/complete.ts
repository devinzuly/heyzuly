/**
 * POST /api/wave/complete — mark active Wave completed (week 4 / past ends_at).
 * Shame-free celebration payload; soft next-Wave is a separate POST /api/wave.
 */

import { resolveChatSession } from '../../lib/auth';
import {
  completeActiveWave,
  serializeCelebration,
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

  try {
    const completed = await completeActiveWave(env.DB, session.userId);
    if (!completed) {
      return jsonResponse(
        {
          ok: false,
          error: 'not_eligible',
          hint: 'Finish Wave week 4 (or wait until ends_at) before completing. Or there may be no active Wave.',
        },
        400
      );
    }

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      wave: serializeWave(completed),
      completed_wave: serializeWave(completed),
      celebration: serializeCelebration(completed),
      can_complete: false,
    });
  } catch (err) {
    console.error('wave complete failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
