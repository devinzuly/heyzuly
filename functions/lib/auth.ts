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
