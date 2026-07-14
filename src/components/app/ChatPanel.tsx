import { useCallback, useEffect, useRef, useState } from 'react';

export interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type PillarId = 'meditation' | 'self-healing' | 'body' | 'life-guidance';

interface WavePrefs {
  pillar?: PillarId;
  label?: string;
  week?: number;
  status?: 'none' | 'starting' | 'active' | 'paused';
}

interface ChatPanelProps {
  /** Optional Clerk token for authenticated chat; omit under CHAT_DEV_BYPASS */
  getToken?: () => Promise<string | null>;
  subtitle?: string;
  /** Bump Wave today panel after Talk → build confirm. */
  onDayPlanConfirmed?: () => void;
}

interface ProposedItem {
  id: string;
  text: string;
  pillar: PillarId;
  done: boolean;
}

/** Soft offer when the user already sounds ready for a tiny day plan. */
function looksPlanReady(text: string): boolean {
  return /\b(for today|today'?s plan|build (a |my )?day|plan (my|the)? ?day|tiny (step|action)s?|what should i do|make a plan|map (this|it)|one small step|that'?s enough for today)\b/i.test(
    text
  );
}

const PILLAR_OPTIONS: Array<{ id: PillarId; label: string }> = [
  { id: 'meditation', label: 'Meditation' },
  { id: 'self-healing', label: 'Self-healing' },
  { id: 'body', label: 'Body' },
  { id: 'life-guidance', label: 'Life guidance' },
];

const PILLAR_LABELS: Record<PillarId, string> = {
  meditation: 'Meditation',
  'self-healing': 'Self-healing',
  body: 'Body',
  'life-guidance': 'Life guidance',
};

function buildStarterGreeting(opts: {
  preferredName?: string;
  pillar?: PillarId | null;
  waveStarting?: boolean;
}): ChatUiMessage {
  const name = opts.preferredName?.trim();
  const hello = name ? `Hi ${name}.` : 'Good to see you.';
  let body: string;
  if (opts.waveStarting && opts.pillar) {
    body = `${hello} I'm with you on your First Wave — ${PILLAR_LABELS[opts.pillar]}. Say what's on your mind; we'll keep it one small step.`;
  } else {
    body = `${hello} Say what's on your mind — I'll keep it one small step at a time.`;
  }
  return { id: 'z0', role: 'assistant', content: body };
}

const STARTER: ChatUiMessage[] = [buildStarterGreeting({})];

function authHeaders(
  token: string | null,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

type ChatSseEvent =
  | { type: 'meta'; mode?: string; user_id?: string }
  | { type: 'delta'; text?: string }
  | {
      type: 'done';
      ok?: boolean;
      reply?: string;
      mode?: string;
      prefs?: { wave?: WavePrefs | null } | null;
      persisted?: {
        user_message_id?: number;
        assistant_message_id?: number;
      } | null;
    }
  | { type: 'error'; ok?: false; error?: string };

/** Parse SSE `data:` JSON lines from a fetch body. */
async function* iterChatSse(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ChatSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const block of parts) {
        for (const line of block.split('\n')) {
          const trimmed = line.trimEnd();
          if (!trimmed.startsWith('data:')) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw) continue;
          try {
            yield JSON.parse(raw) as ChatSseEvent;
          } catch {
            // ignore malformed chunk
          }
        }
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        const trimmed = line.trimEnd();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw) continue;
        try {
          yield JSON.parse(raw) as ChatSseEvent;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function isPillarUi(value: unknown): value is PillarId {
  return (
    value === 'meditation' ||
    value === 'self-healing' ||
    value === 'body' ||
    value === 'life-guidance'
  );
}

export function ChatPanel({ getToken, subtitle, onDayPlanConfirmed }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatUiMessage[]>(STARTER);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [pillar, setPillar] = useState<PillarId | null>(null);
  const [waveActive, setWaveActive] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [proposed, setProposed] = useState<ProposedItem[] | null>(null);
  const [proposeSource, setProposeSource] = useState('');
  const [proposeCap, setProposeCap] = useState(3);
  const [offerBuild, setOfferBuild] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildHint, setBuildHint] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  const applyPrefs = useCallback(
    (
      prefs:
        | {
            wave?: WavePrefs | null;
            facts?: Array<{ key: string; value: string }>;
          }
        | null
        | undefined
    ) => {
      if (!prefs?.wave) return;
      if (prefs.wave.pillar) setPillar(prefs.wave.pillar);
      if (prefs.wave.status && prefs.wave.status !== 'none') {
        setWaveActive(true);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = getToken ? await getToken() : null;
        const res = await fetch('/api/chat', {
          method: 'GET',
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          // Keep starter greeting if history cannot load (e.g. missing migration).
          return;
        }

        applyPrefs(data.prefs);

        const rows = Array.isArray(data.messages) ? data.messages : [];
        const loaded: ChatUiMessage[] = rows
          .filter(
            (m: { role?: string; content?: string }) =>
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string' &&
              m.content.trim()
          )
          .map((m: { id?: number | string; role: 'user' | 'assistant'; content: string }) => ({
            id: `db-${m.id ?? `${m.role}-${m.content.slice(0, 12)}`}`,
            role: m.role,
            content: m.content,
          }));

        if (loaded.length > 0) {
          setMessages(loaded);
          requestAnimationFrame(() => {
            threadRef.current?.scrollTo({
              top: threadRef.current.scrollHeight,
            });
          });
        } else {
          const facts = Array.isArray(data.prefs?.facts) ? data.prefs.facts : [];
          const preferredName = facts.find(
            (f: { key?: string; value?: string }) => f.key === 'profile.preferred_name'
          )?.value;
          const wave = data.prefs?.wave as WavePrefs | null | undefined;
          setMessages([
            buildStarterGreeting({
              preferredName:
                typeof preferredName === 'string' ? preferredName : undefined,
              pillar: wave?.pillar ?? null,
              waveStarting: wave?.status === 'starting',
            }),
          ]);
        }
      } catch {
        // Network blip — leave starter in place.
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPrefs, getToken]);

  const saveWavePrefs = useCallback(
    async (nextPillar: PillarId | null, startWave: boolean) => {
      if (!nextPillar && !startWave) return;
      setSavingPrefs(true);
      setError('');
      try {
        const token = getToken ? await getToken() : null;
        const wave =
          startWave && nextPillar
            ? {
                pillar: nextPillar,
                status: 'starting' as const,
                week: 1,
              }
            : nextPillar
              ? {
                  pillar: nextPillar,
                  status: waveActive ? ('starting' as const) : ('none' as const),
                }
              : undefined;

        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ wave }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(
            data.error === 'unauthorized'
              ? 'Memory API unauthorized — set CHAT_DEV_BYPASS=true in .dev.vars or sign in.'
              : data.hint ?? 'Could not save preference. Try again.'
          );
          return;
        }
        applyPrefs(data.prefs);
        if (startWave) setWaveActive(true);
      } catch {
        setError('Network error saving preference.');
      } finally {
        setSavingPrefs(false);
      }
    },
    [applyPrefs, getToken, waveActive]
  );

  const buildFromTalk = useCallback(async () => {
    if (building) return;
    setBuilding(true);
    setError('');
    setBuildHint('');
    try {
      const token = getToken ? await getToken() : null;
      const payload = {
        pillar: pillar ?? undefined,
        messages: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content })),
      };
      const res = await fetch('/api/wave/build-from-talk', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.hint
            ? String(data.hint)
            : data.error === 'nothing_to_build'
              ? 'Say a little first — then we can shape today’s tiny steps.'
              : 'Could not build a day plan from this chat.'
        );
        return;
      }
      const items = Array.isArray(data.proposed?.items)
        ? (data.proposed.items as ProposedItem[])
        : [];
      setProposed(
        items.map((item, i) => ({
          id: item.id || `t${i + 1}`,
          text: String(item.text || '').slice(0, 200),
          pillar: (isPillarUi(item.pillar) ? item.pillar : pillar) ?? 'self-healing',
          done: false,
        }))
      );
      setProposeSource(String(data.proposed?.source ?? 'stub'));
      setProposeCap(Number(data.proposed?.cap) || items.length || 3);
      setOfferBuild(false);
      setBuildHint(
        'Draft only — edit, remove, or confirm. Nothing is saved until you confirm.'
      );
    } catch {
      setError('Network error building today’s plan.');
    } finally {
      setBuilding(false);
    }
  }, [building, getToken, messages, pillar]);

  const confirmProposed = useCallback(async () => {
    if (building || !proposed?.length) return;
    setBuilding(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch('/api/wave/today', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          items: proposed.map((item) => ({
            id: item.id,
            text: item.text.trim().slice(0, 200),
            pillar: item.pillar,
            done: false,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.hint
            ? String(data.hint)
            : 'Could not save today’s plan.'
        );
        return;
      }
      setProposed(null);
      setOfferBuild(false);
      setBuildHint('Saved — your Wave today panel has these tiny actions.');
      onDayPlanConfirmed?.();
    } catch {
      setError('Network error saving today’s plan.');
    } finally {
      setBuilding(false);
    }
  }, [building, getToken, onDayPlanConfirmed, proposed]);

  const send = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending) return;
    if (looksPlanReady(content)) {
      setOfferBuild(true);
    }

    const userMsg: ChatUiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };

    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const wave =
      pillar != null
        ? {
            pillar,
            status: (waveActive ? 'starting' : 'none') as 'starting' | 'none',
            week: waveActive ? 1 : undefined,
          }
        : undefined;

    // First real user turn after onboarding: light English context for stub/Anthropic.
    const isFirstUserTurn =
      messages.filter((m) => m.role === 'user').length === 0 && waveActive && pillar != null;
    const conversationMessages = isFirstUserTurn
      ? [
          {
            role: 'system' as const,
            content:
              `First session after onboarding. English-primary; no Spanish or "mija" yet. ` +
              `User is starting First Wave on ${PILLAR_LABELS[pillar!]}. Acknowledge that focus briefly, then one small next step.`,
          },
          ...history,
        ]
      : history;

    const assistantId = `z-${Date.now()}`;
    const assistantMsg: ChatUiMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft('');
    setSending(true);
    setError('');

    const scrollThread = () => {
      requestAnimationFrame(() => {
        threadRef.current?.scrollTo({
          top: threadRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
    };

    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: authHeaders(token, { Accept: 'text/event-stream' }),
        body: JSON.stringify({
          messages: conversationMessages,
          stream: true,
          ...(wave ? { wave } : {}),
        }),
      });

      const contentType = res.headers.get('Content-Type') ?? '';

      // JSON fallback (errors, older handlers, or non-stream clients)
      if (!contentType.includes('text/event-stream')) {
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id)
          );
          setError(
            data.error === 'unauthorized'
              ? 'Chat API unauthorized — set CHAT_DEV_BYPASS=true in .dev.vars (local) or sign in with Clerk.'
              : 'Could not reach Zuly. Try again.'
          );
          return;
        }

        applyPrefs(data.prefs);
        const finalAssistantId =
          data.persisted?.assistant_message_id != null
            ? `db-${data.persisted.assistant_message_id}`
            : assistantId;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === userMsg.id && data.persisted?.user_message_id != null) {
              return { ...m, id: `db-${data.persisted.user_message_id}` };
            }
            if (m.id === assistantId) {
              return {
                ...m,
                id: finalAssistantId,
                content: String(data.reply ?? ''),
              };
            }
            return m;
          })
        );
        scrollThread();
        return;
      }

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id)
        );
        setError(
          res.status === 401
            ? 'Chat API unauthorized — set CHAT_DEV_BYPASS=true in .dev.vars (local) or sign in with Clerk.'
            : 'Could not reach Zuly. Try again.'
        );
        return;
      }

      let gotDone = false;
      for await (const event of iterChatSse(res.body)) {
        if (event.type === 'delta' && typeof event.text === 'string') {
          const piece = event.text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + piece } : m
            )
          );
          scrollThread();
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id)
          );
          setError(
            event.error === 'unauthorized'
              ? 'Chat API unauthorized — set CHAT_DEV_BYPASS=true in .dev.vars (local) or sign in with Clerk.'
              : 'Could not reach Zuly. Try again.'
          );
          return;
        } else if (event.type === 'done') {
          gotDone = true;
          if (event.ok === false) {
            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id)
            );
            setError('Could not reach Zuly. Try again.');
            return;
          }
          applyPrefs(event.prefs);
          const finalAssistantId =
            event.persisted?.assistant_message_id != null
              ? `db-${event.persisted.assistant_message_id}`
              : assistantId;
          const finalReply =
            typeof event.reply === 'string' ? event.reply : undefined;

          setMessages((prev) =>
            prev.map((m) => {
              if (
                m.id === userMsg.id &&
                event.persisted?.user_message_id != null
              ) {
                return { ...m, id: `db-${event.persisted.user_message_id}` };
              }
              if (m.id === assistantId) {
                return {
                  ...m,
                  id: finalAssistantId,
                  content: finalReply ?? m.content,
                };
              }
              return m;
            })
          );
          scrollThread();
        }
      }

      if (!gotDone) {
        setMessages((prev) => {
          const assistant = prev.find((m) => m.id === assistantId);
          if (assistant?.content.trim()) return prev;
          return prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id);
        });
        setError('Stream ended early — try again.');
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id)
      );
      setError('Network error — try again.');
    } finally {
      setSending(false);
    }
  }, [applyPrefs, draft, getToken, messages, pillar, sending, waveActive]);

  return (
    <div className="chat-stub">
      <div className="chat-stub-head">
        <div className="chat-stub-av" aria-hidden="true">
          Z
        </div>
        <div>
          <h2>Talk to Zuly</h2>
          <p>
            {subtitle ??
              'Phase 4 chat — streams stub (or Anthropic) replies token-by-token.'}
          </p>
        </div>
      </div>

      <div className="chat-prefs" aria-label="Wave and pillar preferences">
        <p className="chat-prefs-label">Start with a pillar</p>
        <div className="chat-prefs-chips" role="group" aria-label="Pillars">
          {PILLAR_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`chat-pref-chip${pillar === opt.id ? ' is-active' : ''}`}
              disabled={savingPrefs || loadingHistory}
              aria-pressed={pillar === opt.id}
              onClick={() => {
                const next = opt.id;
                setPillar(next);
                void saveWavePrefs(next, false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="chat-prefs-actions">
          <button
            type="button"
            className={`chat-pref-wave${waveActive ? ' is-active' : ''}`}
            disabled={!pillar || savingPrefs || loadingHistory}
            onClick={() => {
              if (!pillar) return;
              void saveWavePrefs(pillar, true);
            }}
          >
            {waveActive ? 'First Wave started' : 'Start First Wave'}
          </button>
          {pillar ? (
            <span className="chat-prefs-hint">
              {waveActive
                ? `Focus: ${PILLAR_OPTIONS.find((p) => p.id === pillar)?.label ?? pillar}`
                : 'Pick Start First Wave when you are ready.'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="chat-stub-thread" ref={threadRef} role="log" aria-live="polite">
        {loadingHistory ? (
          <div className="bub z chat-typing">
            <span className="who">Zuly</span>
            …
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'assistant' ? (
              <div
                className={`bub z${!m.content && sending ? ' chat-typing' : ''}`}
                key={m.id}
              >
                <span className="who">Zuly</span>
                {m.content || (sending ? '…' : '')}
              </div>
            ) : (
              <div className="bub u" key={m.id}>
                {m.content}
              </div>
            )
          )
        )}
      </div>

      {error ? <p className="chat-stub-error">{error}</p> : null}

      <div className="chat-build-day" aria-label="Build today from chat">
        {offerBuild && !proposed ? (
          <p className="chat-build-offer">
            Sounds like you’re ready for a tiny day — want to shape it from this chat?
          </p>
        ) : null}
        <div className="chat-build-actions">
          <button
            type="button"
            className="chat-build-btn"
            disabled={
              building ||
              loadingHistory ||
              messages.filter((m) => m.role === 'user').length === 0
            }
            onClick={() => void buildFromTalk()}
          >
            {building && !proposed ? 'Shaping…' : 'Build today from this chat'}
          </button>
          {proposed ? (
            <button
              type="button"
              className="chat-build-dismiss"
              disabled={building}
              onClick={() => {
                setProposed(null);
                setBuildHint('Okay — keep talking. We can shape a day whenever you’re ready.');
              }}
            >
              Not now
            </button>
          ) : null}
        </div>

        {proposed ? (
          <div className="chat-build-propose">
            <p className="chat-build-propose-label">
              Proposed tiny actions
              {proposeSource ? ` · ${proposeSource}` : ''}
              {proposeCap ? ` · up to ${proposeCap}` : ''}
            </p>
            <ul className="chat-build-items">
              {proposed.map((item, idx) => (
                <li key={item.id} className="chat-build-item">
                  <label className="sr-only" htmlFor={`build-item-${item.id}`}>
                    Tiny action {idx + 1}
                  </label>
                  <input
                    id={`build-item-${item.id}`}
                    type="text"
                    className="chat-build-item-input"
                    value={item.text}
                    maxLength={200}
                    disabled={building}
                    onChange={(e) => {
                      const text = e.target.value;
                      setProposed((prev) =>
                        prev
                          ? prev.map((p) =>
                              p.id === item.id ? { ...p, text } : p
                            )
                          : prev
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="chat-build-remove"
                    disabled={building || proposed.length <= 1}
                    aria-label={`Remove: ${item.text}`}
                    onClick={() => {
                      setProposed((prev) =>
                        prev && prev.length > 1
                          ? prev.filter((p) => p.id !== item.id)
                          : prev
                      );
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="chat-build-confirm-row">
              <button
                type="button"
                className="chat-build-confirm"
                disabled={
                  building ||
                  !proposed.some((p) => p.text.trim()) ||
                  proposed.length === 0
                }
                onClick={() => void confirmProposed()}
              >
                {building ? 'Saving…' : 'Confirm for today'}
              </button>
              <button
                type="button"
                className="chat-build-dismiss"
                disabled={building}
                onClick={() => void buildFromTalk()}
              >
                Refresh draft
              </button>
            </div>
          </div>
        ) : null}

        {buildHint ? <p className="chat-build-hint">{buildHint}</p> : null}
      </div>

      <form
        className="chat-stub-input is-live"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor="chat-draft">
          Message Zuly
        </label>
        <input
          id="chat-draft"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message Zuly…"
          disabled={sending || loadingHistory}
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-stub-send"
          disabled={sending || loadingHistory || !draft.trim()}
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
