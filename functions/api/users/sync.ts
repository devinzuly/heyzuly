import { isInviteRequired, verifyClerkRequest } from '../../lib/auth';
import { jsonResponse } from '../../lib/waitlist';
import { isEmailInvited, upsertUser } from '../../lib/users';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = await verifyClerkRequest(request, env.CLERK_SECRET_KEY);
  if (!session) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  const email = session.email?.trim().toLowerCase();
  if (!email) {
    return jsonResponse({ ok: false, error: 'email_required' }, 400);
  }

  if (isInviteRequired(env)) {
    const invited = await isEmailInvited(env.DB, email);
    if (!invited) {
      return jsonResponse({ ok: false, error: 'not_invited' }, 403);
    }
  }

  try {
    const user = await upsertUser(env.DB, session.userId, email);
    return jsonResponse({
      ok: true,
      user: {
        email: user.email,
        onboarding_complete: user.onboarding_complete === 1,
      },
    });
  } catch (err) {
    console.error('users sync failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
};
