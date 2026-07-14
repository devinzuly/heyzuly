export type StoredRole = 'user' | 'assistant' | 'system';

export interface StoredMessage {
  id: number;
  user_id: string;
  conversation_id: number;
  role: StoredRole;
  content: string;
  channel: string;
  created_at: string;
}

export interface ConversationRow {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/** Cap for GET history — enough for stub UI reload without dumping entire thread. */
export const HISTORY_LIMIT = 50;

export async function getOrCreateConversation(
  db: D1Database,
  userId: string
): Promise<ConversationRow> {
  const existing = await db
    .prepare(
      `SELECT id, user_id, created_at, updated_at
       FROM conversations WHERE user_id = ?`
    )
    .bind(userId)
    .first<ConversationRow>();

  if (existing) {
    return existing;
  }

  await db
    .prepare(`INSERT INTO conversations (user_id) VALUES (?)`)
    .bind(userId)
    .run();

  const created = await db
    .prepare(
      `SELECT id, user_id, created_at, updated_at
       FROM conversations WHERE user_id = ?`
    )
    .bind(userId)
    .first<ConversationRow>();

  if (!created) {
    throw new Error('conversation create failed');
  }
  return created;
}

export async function persistChatTurn(
  db: D1Database,
  opts: {
    userId: string;
    userContent: string;
    assistantContent: string;
    channel?: string;
  }
): Promise<{ conversationId: number; userMessageId: number; assistantMessageId: number }> {
  const channel = opts.channel ?? 'app';
  const conversation = await getOrCreateConversation(db, opts.userId);

  const userInsert = await db
    .prepare(
      `INSERT INTO messages (user_id, conversation_id, role, content, channel)
       VALUES (?, ?, 'user', ?, ?)`
    )
    .bind(opts.userId, conversation.id, opts.userContent, channel)
    .run();

  const assistantInsert = await db
    .prepare(
      `INSERT INTO messages (user_id, conversation_id, role, content, channel)
       VALUES (?, ?, 'assistant', ?, ?)`
    )
    .bind(opts.userId, conversation.id, opts.assistantContent, channel)
    .run();

  await db
    .prepare(
      `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`
    )
    .bind(conversation.id)
    .run();

  return {
    conversationId: conversation.id,
    userMessageId: Number(userInsert.meta.last_row_id),
    assistantMessageId: Number(assistantInsert.meta.last_row_id),
  };
}

export async function listRecentMessages(
  db: D1Database,
  userId: string,
  limit = HISTORY_LIMIT
): Promise<StoredMessage[]> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const { results } = await db
    .prepare(
      `SELECT id, user_id, conversation_id, role, content, channel, created_at
       FROM messages
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .bind(userId, safeLimit)
    .all<StoredMessage>();

  // Chronological for the UI
  return (results ?? []).reverse();
}
