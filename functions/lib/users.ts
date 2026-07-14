export interface UserRow {
  id: number;
  auth_provider_id: string;
  email: string;
  created_at: string;
  onboarding_complete: number;
}

export async function findUserByAuthId(
  db: D1Database,
  authProviderId: string
): Promise<UserRow | null> {
  return db
    .prepare(
      `SELECT id, auth_provider_id, email, created_at, onboarding_complete
       FROM users WHERE auth_provider_id = ?`
    )
    .bind(authProviderId)
    .first<UserRow>();
}

export async function upsertUser(
  db: D1Database,
  authProviderId: string,
  email: string
): Promise<UserRow> {
  await db
    .prepare(
      `INSERT INTO users (auth_provider_id, email)
       VALUES (?, ?)
       ON CONFLICT(auth_provider_id) DO UPDATE SET email = excluded.email`
    )
    .bind(authProviderId, email)
    .run();

  const user = await findUserByAuthId(db, authProviderId);
  if (!user) {
    throw new Error('user upsert failed');
  }
  return user;
}

export async function completeOnboarding(
  db: D1Database,
  authProviderId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE users SET onboarding_complete = 1 WHERE auth_provider_id = ?`
    )
    .bind(authProviderId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export async function isEmailInvited(
  db: D1Database,
  email: string
): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS ok FROM invites WHERE email = ? COLLATE NOCASE')
    .bind(email)
    .first<{ ok: number }>();

  return Boolean(row);
}

export async function grantInvite(
  db: D1Database,
  email: string,
  invitedBy = 'admin'
): Promise<'granted' | 'exists'> {
  try {
    await db
      .prepare(
        `INSERT INTO invites (email, invited_by) VALUES (?, ?)`
      )
      .bind(email, invitedBy)
      .run();
    return 'granted';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('UNIQUE constraint failed')) {
      return 'exists';
    }
    throw err;
  }
}
