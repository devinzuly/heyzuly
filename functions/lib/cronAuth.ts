/**
 * Admin/dev auth for cron-style endpoints (nudge stubs, etc.).
 * Accepts CRON_SECRET or INVITE_ADMIN_SECRET Bearer.
 * Local CHAT_DEV_BYPASS: allow when neither secret is configured.
 */

export type CronAuthResult =
  | { ok: true; mode: 'cron' | 'invite_admin' | 'dev_bypass' }
  | { ok: false; status: 401 | 503; error: string; hint?: string };

export function authorizeCronOrAdmin(
  request: Request,
  env: Env
): CronAuthResult {
  const cron = env.CRON_SECRET?.trim();
  const invite = env.INVITE_ADMIN_SECRET?.trim();
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (cron && token === cron) {
    return { ok: true, mode: 'cron' };
  }
  if (invite && token === invite) {
    return { ok: true, mode: 'invite_admin' };
  }

  const bypass =
    env.CHAT_DEV_BYPASS === 'true' || env.CHAT_DEV_BYPASS === '1';
  if (bypass && !cron && !invite) {
    // Local-only dry-run when no admin secrets are set yet.
    return { ok: true, mode: 'dev_bypass' };
  }

  if (!cron && !invite) {
    return {
      ok: false,
      status: 503,
      error: 'not_configured',
      hint: 'Set CRON_SECRET or INVITE_ADMIN_SECRET in .dev.vars (or enable CHAT_DEV_BYPASS alone for local stub).',
    };
  }

  return {
    ok: false,
    status: 401,
    error: 'unauthorized',
    hint: 'Authorization: Bearer <CRON_SECRET or INVITE_ADMIN_SECRET>',
  };
}
