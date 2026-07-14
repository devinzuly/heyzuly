import { verifyClerkRequest } from '../../lib/auth';
import { jsonResponse } from '../../lib/waitlist';
import { completeOnboarding } from '../../lib/users';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = await verifyClerkRequest(request, env.CLERK_SECRET_KEY);
  if (!session) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  try {
    const updated = await completeOnboarding(env.DB, session.userId);
    if (!updated) {
      return jsonResponse({ ok: false, error: 'user_not_found' }, 404);
    }

    return jsonResponse({ ok: true, onboarding_complete: true });
  } catch (err) {
    console.error('onboarding complete failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
};
