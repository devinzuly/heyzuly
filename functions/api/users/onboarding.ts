import { resolveChatSession } from '../../lib/auth';
import {
  parseOnboardingPayload,
  persistOnboarding,
} from '../../lib/onboarding';
import { loadUserPrefs } from '../../lib/memory';
import { jsonResponse } from '../../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

/**
 * POST /api/users/onboarding
 * Completes micro-flow: preferred name → pillars → rhythm → seed facts + First Wave prefs.
 * Optional soft-launch survey: { survey?: { season_label, hard_window, heal_theme, heal_mode, heal_energy } }
 * Body: { preferred_name?: string, pillars: PillarId[1..2], rhythm: CheckinRhythm, survey?: … }
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const parsed = parseOnboardingPayload(raw);
  if (!parsed.ok) {
    return jsonResponse({ ok: false, error: parsed.error }, 400);
  }

  try {
    const result = await persistOnboarding(
      env.DB,
      session.userId,
      parsed.payload
    );

    let prefs: Awaited<ReturnType<typeof loadUserPrefs>> | null = null;
    try {
      prefs = await loadUserPrefs(env.DB, session.userId);
    } catch (prefsErr) {
      console.error('onboarding prefs reload failed', prefsErr);
    }

    return jsonResponse({
      ok: true,
      onboarding_complete: true,
      user_id: session.userId,
      wave: result.wave,
      wave_row: result.wave_row
        ? {
            id: result.wave_row.id,
            label: result.wave_row.label,
            primary_pillar: result.wave_row.primary_pillar,
            week: result.wave_row.week,
            status: result.wave_row.status,
          }
        : null,
      today: result.today
        ? {
            id: result.today.id,
            date: result.today.plan_date,
            items: result.today.items,
            status: result.today.status,
          }
        : null,
      seeded: result.facts,
      prefs,
    });
  } catch (err) {
    console.error('onboarding complete failed', err);
    return jsonResponse(
      {
        ok: false,
        error: 'server_error',
        hint: 'Run npm run db:migrate:local (users + user_facts + waves).',
      },
      500
    );
  }
};
