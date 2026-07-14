/**
 * GET/POST /api/memory — D1 user_facts + Wave prefs (no new vendor).
 */
import { resolveChatSession } from '../lib/auth';
import {
  loadUserPrefs,
  parseMemoryFacts,
  parseWaveContext,
  upsertMemoryFacts,
  upsertWavePrefs,
} from '../lib/memory';
import { jsonResponse } from '../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  try {
    const prefs = await loadUserPrefs(env.DB, session.userId);
    return jsonResponse({
      ok: true,
      user_id: session.userId,
      prefs,
    });
  } catch (err) {
    console.error('memory get failed', err);
    return jsonResponse(
      {
        ok: false,
        error: 'server_error',
        hint: 'Run npm run db:migrate:memory:local (migration 0004).',
      },
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  if (!raw || typeof raw !== 'object') {
    return jsonResponse({ ok: false, error: 'invalid_body' }, 400);
  }

  const obj = raw as Record<string, unknown>;
  const wave = parseWaveContext(obj.wave);
  const facts = parseMemoryFacts(obj.memory ?? { facts: obj.facts });

  if (!wave && !facts?.length) {
    return jsonResponse({ ok: false, error: 'wave_or_facts_required' }, 400);
  }

  try {
    if (wave) {
      await upsertWavePrefs(env.DB, session.userId, wave);
    }
    if (facts?.length) {
      await upsertMemoryFacts(env.DB, session.userId, facts);
    }

    const prefs = await loadUserPrefs(env.DB, session.userId);
    return jsonResponse({
      ok: true,
      user_id: session.userId,
      prefs,
    });
  } catch (err) {
    console.error('memory post failed', err);
    return jsonResponse(
      {
        ok: false,
        error: 'server_error',
        hint: 'Run npm run db:migrate:memory:local (migration 0004).',
      },
      500
    );
  }
};
