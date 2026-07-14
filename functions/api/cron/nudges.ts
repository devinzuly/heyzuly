/**
 * POST /api/cron/nudges — admin/dev: list due users + write stub nudge_log rows.
 * Does NOT call Resend / Twilio / Meta.
 * Auth: Bearer CRON_SECRET | INVITE_ADMIN_SECRET (or CHAT_DEV_BYPASS with no secrets).
 *
 * Body (optional):
 *   { planned_for?: "YYYY-MM-DD", channel?: "app"|"email"|"sms"|"whatsapp",
 *     user_id?: string, log_skips?: boolean }
 */

import { authorizeCronOrAdmin } from '../../lib/cronAuth';
import { runCheckinNudgeStub, type NudgeChannel } from '../../lib/nudges';
import { jsonResponse } from '../../lib/waitlist';

const CHANNELS = new Set(['app', 'email', 'sms', 'whatsapp']);

const MIGRATE_HINT =
  'Run npm run db:migrate:nudges:local (migration 0006) after waves migrate.';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = authorizeCronOrAdmin(request, env);
  if (!auth.ok) {
    return jsonResponse(
      { ok: false, error: auth.error, hint: auth.hint },
      auth.status
    );
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
  const plannedFor =
    typeof obj.planned_for === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.planned_for)
      ? obj.planned_for
      : undefined;
  const channelRaw =
    typeof obj.channel === 'string' ? obj.channel.trim() : 'app';
  if (!CHANNELS.has(channelRaw)) {
    return jsonResponse({ ok: false, error: 'invalid_channel' }, 400);
  }
  const onlyUserId =
    typeof obj.user_id === 'string' && obj.user_id.trim()
      ? obj.user_id.trim().slice(0, 128)
      : undefined;
  const logSkips = obj.log_skips === false ? false : true;

  try {
    const result = await runCheckinNudgeStub(env.DB, {
      plannedFor,
      channel: channelRaw as NudgeChannel,
      onlyUserId,
      logSkips,
    });

    return jsonResponse({
      ok: true,
      mode: 'stub',
      auth: auth.mode,
      vendor_send: false,
      note: 'Would-send only — Resend/Twilio/Meta not called. Real send = vendor hold.',
      ...result,
    });
  } catch (err) {
    console.error('cron nudges failed', err);
    return jsonResponse(
      { ok: false, error: 'server_error', hint: MIGRATE_HINT },
      500
    );
  }
};
