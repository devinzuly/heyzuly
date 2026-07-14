import { isInviteRequired } from '../../lib/auth';
import { jsonResponse } from '../../lib/waitlist';

/**
 * Public invite-mode probe — no secrets, no email lookup.
 * Used by sign-up tip + You tab access status.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  return jsonResponse({
    ok: true,
    invite_required: isInviteRequired(context.env),
  });
};
