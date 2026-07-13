import {
  getClientIp,
  hashIp,
  isRateLimited,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
} from '../lib/waitlist';

interface WaitlistBody {
  email?: string;
  website?: string;
  source?: string;
  utm?: Record<string, string>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: WaitlistBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_request' }, 400);
  }

  // Honeypot: bots fill hidden fields; pretend success without storing
  if (body.website && body.website.trim() !== '') {
    return jsonResponse({
      ok: true,
      message: "You're in. We'll be in touch soon.",
    });
  }

  const email = normalizeEmail(body.email ?? '');
  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }

  const salt = env.WAITLIST_IP_SALT || 'heyzuly-dev-salt';
  const ipHash = await hashIp(getClientIp(request), salt);

  if (await isRateLimited(env.DB, ipHash)) {
    return jsonResponse({ ok: false, error: 'rate_limited' }, 429);
  }

  const source =
    typeof body.source === 'string' && body.source.trim()
      ? body.source.trim().slice(0, 64)
      : 'landing';

  const utmJson =
    body.utm && typeof body.utm === 'object'
      ? JSON.stringify(body.utm).slice(0, 1024)
      : null;

  try {
    await env.DB.prepare(
      `INSERT INTO waitlist (email, source, utm_json, ip_hash)
       VALUES (?, ?, ?, ?)`
    )
      .bind(email, source, utmJson, ipHash)
      .run();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE constraint failed')) {
      return jsonResponse({ ok: false, error: 'duplicate' }, 409);
    }
    console.error('waitlist insert failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }

  return jsonResponse({
    ok: true,
    message: "You're in. We'll be in touch soon.",
  });
};
