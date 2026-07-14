import { jsonResponse } from '../../lib/waitlist';
import { grantInvite } from '../../lib/users';

interface GrantBody {
  email?: string;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const secret = env.INVITE_ADMIN_SECRET;
  if (!secret) {
    return jsonResponse({ ok: false, error: 'not_configured' }, 503);
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || token !== secret) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  let body: GrantBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_request' }, 400);
  }

  const email = normalizeEmail(body.email ?? '');
  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }

  try {
    const result = await grantInvite(env.DB, email);
    return jsonResponse({
      ok: true,
      status: result,
      email,
      message:
        result === 'granted'
          ? 'Invite granted. User can sign up with this email.'
          : 'Email was already invited.',
    });
  } catch (err) {
    console.error('invite grant failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
};
