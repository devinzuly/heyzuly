import { resolveChatSession } from '../lib/auth';
import {
  formatSseEvent,
  generateChatReply,
  generateChatReplyStream,
  lastUserContent,
  parseChatBody,
  wantsStream,
  type ChatRequestBody,
  type ChatReplyMode,
  type ChatStreamEvent,
} from '../lib/chat';
import {
  listUserFacts,
  loadUserPrefs,
  upsertMemoryFacts,
  upsertWavePrefs,
  waveFromFacts,
  type WaveContext,
} from '../lib/memory';
import { listRecentMessages, persistChatTurn } from '../lib/messages';
import {
  formatActiveWaveInjection,
  loadWaveContextBundle,
  planHintsFromFacts,
} from '../lib/waves';
import { jsonResponse } from '../lib/waitlist';

const UNAUTHORIZED = {
  ok: false,
  error: 'unauthorized',
  hint: 'Set CLERK_SECRET_KEY, or for local-only stub work set CHAT_DEV_BYPASS=true in .dev.vars (never enable in production).',
} as const;

type PersistResult = {
  conversation_id: number;
  user_message_id: number;
  assistant_message_id: number;
} | null;

/** GET /api/chat — recent persisted messages + Wave/prefs for the current user. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;
    const messages = await listRecentMessages(
      env.DB,
      session.userId,
      Number.isFinite(limit) ? limit : undefined
    );

    let prefs: Awaited<ReturnType<typeof loadUserPrefs>> | null = null;
    try {
      prefs = await loadUserPrefs(env.DB, session.userId);
    } catch (prefsErr) {
      console.error('chat prefs load failed', prefsErr);
    }

    return jsonResponse({
      ok: true,
      user_id: session.userId,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        channel: m.channel,
        created_at: m.created_at,
      })),
      prefs,
    });
  } catch (err) {
    console.error('chat history failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
};

async function prepareChatContext(
  env: Env,
  userId: string,
  body: ChatRequestBody
): Promise<{
  wave: WaveContext | null;
  storedFacts: Array<{ key: string; value: string }>;
  wavePlanBlock: string;
}> {
  if (body.wave) {
    try {
      await upsertWavePrefs(env.DB, userId, body.wave);
    } catch (waveErr) {
      console.error('wave prefs upsert failed', waveErr);
    }
  }
  if (body.memory?.facts?.length) {
    try {
      await upsertMemoryFacts(env.DB, userId, body.memory.facts);
    } catch (memErr) {
      console.error('memory facts upsert failed', memErr);
    }
  }

  let storedFacts: Array<{ key: string; value: string }> = [];
  let wave: WaveContext | null = body.wave ?? null;
  try {
    const rows = await listUserFacts(env.DB, userId);
    wave = waveFromFacts(rows) ?? wave;
    storedFacts = rows
      .filter((r) => !r.fact_key.startsWith('wave.'))
      .map((r) => ({ key: r.fact_key, value: r.fact_value }));
  } catch (loadErr) {
    console.error('memory load failed', loadErr);
    storedFacts = body.memory?.facts ?? [];
  }

  let wavePlanBlock = '';
  try {
    const bundle = await loadWaveContextBundle(env.DB, userId);
    const hints = planHintsFromFacts(storedFacts);
    wavePlanBlock = formatActiveWaveInjection(
      bundle.wave,
      bundle.today,
      hints
    );
  } catch (waveLoadErr) {
    // Migration 0005 optional until db:migrate:waves:local
    console.error('active wave load failed', waveLoadErr);
  }

  return { wave, storedFacts, wavePlanBlock };
}

async function persistTurn(
  env: Env,
  userId: string,
  userContent: string,
  assistantContent: string,
  channel: string
): Promise<PersistResult> {
  try {
    const turn = await persistChatTurn(env.DB, {
      userId,
      userContent,
      assistantContent,
      channel,
    });
    return {
      conversation_id: turn.conversationId,
      user_message_id: turn.userMessageId,
      assistant_message_id: turn.assistantMessageId,
    };
  } catch (persistErr) {
    console.error('chat persist failed', persistErr);
    return null;
  }
}

async function loadPrefsSafe(
  env: Env,
  userId: string,
  wave: WaveContext | null,
  storedFacts: Array<{ key: string; value: string }>
) {
  try {
    return await loadUserPrefs(env.DB, userId);
  } catch {
    return wave || storedFacts.length
      ? { wave, facts: storedFacts.map((f) => ({ ...f, source: 'manual' as const })) }
      : null;
  }
}

function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/** POST /api/chat — generate reply and persist user + assistant turn. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const session = await resolveChatSession(request, env);
  if (!session) {
    return jsonResponse(UNAUTHORIZED, 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const parsed = parseChatBody(raw);
  if (!parsed.ok) {
    return jsonResponse({ ok: false, error: parsed.error }, 400);
  }

  try {
    const { wave, storedFacts, wavePlanBlock } = await prepareChatContext(
      env,
      session.userId,
      parsed.body
    );
    const userContent = lastUserContent(parsed.body.messages);
    const channel = parsed.body.channel ?? 'app';

    if (wantsStream(request, parsed.body)) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: ChatStreamEvent) => {
            controller.enqueue(encoder.encode(formatSseEvent(event)));
          };

          try {
            let mode: ChatReplyMode = 'stub';
            let reply = '';

            for await (const part of generateChatReplyStream(
              parsed.body,
              env.ANTHROPIC_API_KEY,
              { wave, facts: storedFacts, wavePlanBlock }
            )) {
              if (part.type === 'meta') {
                mode = part.mode;
                send({
                  type: 'meta',
                  mode,
                  user_id: session.userId,
                });
              } else if (part.type === 'delta') {
                reply += part.text;
                send({ type: 'delta', text: part.text });
              } else {
                mode = part.mode;
                reply = part.reply;
              }
            }

            const persisted = await persistTurn(
              env,
              session.userId,
              userContent,
              reply,
              channel
            );
            const prefs = await loadPrefsSafe(
              env,
              session.userId,
              wave,
              storedFacts
            );

            send({
              type: 'done',
              ok: true,
              reply,
              mode,
              user_id: session.userId,
              persisted,
              prefs,
            });
            controller.close();
          } catch (err) {
            console.error('chat stream failed', err);
            try {
              send({ type: 'error', ok: false, error: 'server_error' });
            } catch {
              // ignore enqueue after close
            }
            try {
              controller.close();
            } catch {
              // already closed
            }
          }
        },
      });

      return sseResponse(readable);
    }

    const { reply, mode } = await generateChatReply(
      parsed.body,
      env.ANTHROPIC_API_KEY,
      { wave, facts: storedFacts, wavePlanBlock }
    );

    const persisted = await persistTurn(
      env,
      session.userId,
      userContent,
      reply,
      channel
    );
    const prefs = await loadPrefsSafe(env, session.userId, wave, storedFacts);

    return jsonResponse({
      ok: true,
      reply,
      mode,
      user_id: session.userId,
      persisted,
      prefs,
      stream: false,
    });
  } catch (err) {
    console.error('chat failed', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
};
