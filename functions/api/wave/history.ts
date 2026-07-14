/**
 * GET /api/wave/history?days=7 — recent day_plans for Plan tab
 * (date, status, items summary). Shame-free empties included.
 */

import { resolveChatSession } from '../../lib/auth';
import { listDayPlanHistory } from '../../lib/waves';
import { jsonResponse } from '../../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

const MIGRATE_HINT =
  'Run npm run db:migrate:waves:local (migration 0005) after db:migrate:local.';

function parseDays(url: URL): number {
  const raw = url.searchParams.get('days');
  if (!raw) return 7;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 7;
  return Math.min(Math.max(1, Math.floor(n)), 31);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  const days = parseDays(new URL(request.url));

  try {
    const history = await listDayPlanHistory(env.DB, session.userId, days);
    return jsonResponse({
      ok: true,
      user_id: session.userId,
      days,
      history,
    });
  } catch (err) {
    console.error('wave history failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
