import { createClerkClient, verifyToken } from '@clerk/backend';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export async function verifyClerkRequest(
  request: Request,
  secretKey: string | undefined
): Promise<AuthSession | null> {
  if (!secretKey) {
    return null;
  }

  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!bearerToken) {
    return null;
  }

  try {
    const payload = await verifyToken(bearerToken, { secretKey });
    const userId = payload.sub;
    if (!userId) {
      return null;
    }

    const clerk = createClerkClient({ secretKey });
    const user = await clerk.users.getUser(userId);
    const primaryId = user.primaryEmailAddressId;
    const primary = user.emailAddresses.find((entry) => entry.id === primaryId);
    const email = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;

    return { userId, email };
  } catch {
    return null;
  }
}

export function isInviteRequired(env: Env): boolean {
  return env.INVITE_REQUIRED === 'true' || env.INVITE_REQUIRED === '1';
}

/** Explicit local-only flag — never treat as on by default. */
export function isChatDevBypass(env: Env): boolean {
  return env.CHAT_DEV_BYPASS === 'true' || env.CHAT_DEV_BYPASS === '1';
}

/**
 * Chat auth:
 * - If `CLERK_SECRET_KEY` is set → verify Bearer like other user APIs.
 * - If missing → allow only when `CHAT_DEV_BYPASS=true` (local Pages Functions).
 * Never enable bypass implicitly; production must set Clerk and omit CHAT_DEV_BYPASS.
 */
export async function resolveChatSession(
  request: Request,
  env: Env
): Promise<AuthSession | null> {
  if (env.CLERK_SECRET_KEY) {
    return verifyClerkRequest(request, env.CLERK_SECRET_KEY);
  }

  if (isChatDevBypass(env)) {
    return { userId: 'dev-bypass', email: 'dev@localhost' };
  }

  return null;
}
