/**
 * GET /api/nudges — recent nudge_log for current user (dev) + next check-in estimate.
 * Auth: same as chat (Clerk Bearer or CHAT_DEV_BYPASS).
 */

import { resolveChatSession } from '../lib/auth';
import { listUserFacts } from '../lib/memory';
import {
  estimateNextCheckin,
  listNudgeLogsForUser,
  serializeNudgeLog,
} from '../lib/nudges';
import { jsonResponse } from '../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

const MIGRATE_HINT =
  'Run npm run db:migrate:nudges:local (migration 0006).';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : 20;

  try {
    const facts = await listUserFacts(env.DB, session.userId);
    const map = new Map(facts.map((f) => [f.fact_key, f.fact_value]));
    const next = estimateNextCheckin({
      rhythm: map.get('rhythm.checkin'),
      hardWindow: map.get('rhythm.hard_window'),
    });
    const recent = await listNudgeLogsForUser(env.DB, session.userId, limit);

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      next_checkin: next,
      recent: recent.map(serializeNudgeLog),
    });
  } catch (err) {
    console.error('nudges get failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
