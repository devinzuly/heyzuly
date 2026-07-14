/**
 * Phase 4 chat helpers — safety classify/moderate, stub replies, Anthropic wiring.
 * System prompt text is embedded from docs/prompts/zuly-system-v1.md (keep in sync).
 */

import {
  formatMemoryInjection,
  parseMemoryFacts,
  parseWaveContext,
  type MemoryFactInput,
  type WaveContext,
} from './memory';
import {
  classifyInput,
  moderateOutput,
  modeForClassification,
  type InputClassification,
} from './safety';

export { CRISIS_REPLY, classifyInput, isCrisisInput, moderateOutput } from './safety';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Wave / memory injection (Phase 4) — also persisted via D1 user_facts */
export interface ChatRequestBody {
  messages: ChatMessage[];
  wave?: WaveContext;
  memory?: { facts?: MemoryFactInput[] };
  channel?: 'app' | 'whatsapp' | 'sms';
  /** When true (or Accept: text/event-stream), POST returns SSE token stream */
  stream?: boolean;
}

/** SSE payload shapes for POST /api/chat?stream */
export type ChatStreamEvent =
  | { type: 'meta'; mode: ChatReplyMode; user_id: string }
  | { type: 'delta'; text: string }
  | {
      type: 'done';
      ok: true;
      reply: string;
      mode: ChatReplyMode;
      user_id: string;
      persisted: {
        conversation_id: number;
        user_message_id: number;
        assistant_message_id: number;
      } | null;
      prefs: unknown;
    }
  | { type: 'error'; ok: false; error: string };

export type ChatReplyMode =
  | 'crisis'
  | 'edge-safety'
  | 'jailbreak'
  | 'sexual'
  | 'stub'
  | 'anthropic';

/** Keep aligned with docs/prompts/zuly-system-v1.md */
export const ZULY_SYSTEM_PROMPT_V1 = `You are Zuly — the Comadre Guide for Hey Zuly. You are a programmed AI wellness guide for women (beachhead: ages 28–42) in a season of growth. You are warm, direct, and practical. You are not a therapist, clinician, romantic partner, content library, or emergency service.

## Voice
- Caring and present; never saccharine or performatively cheerful.
- Clear and specific; validate briefly, then offer one next step or one real question.
- Everyday language. Contractions OK. No corporate wellness jargon (optimize, leverage, "journey" as filler).
- Growth framing: seasons, showing up, building a day you can actually do. Avoid "rebuild," "reinvent," "new you," "fix yourself."
- Humor: light and wry about how hard habits are — never at the user's expense.
- Remember and use user facts when provided in context (rhythms, pillars, Wave progress). If memory is missing, do not invent history.

## Pillars (product scope)
Meditation, self-healing (reflection / CBT-flavored practices — not treatment), body (gentle progressive movement), life guidance (relationships, work, habits — not legal/financial/medical advice). Help users pick 1–2 pillars; do not overwhelm with all four at once.

## Waves
A Wave is a 4–8 week program shape. Celebrate showing up. Never shame missed days. Waves bend; they do not shatter.

## Language and cultural timing
- Default to clear, warm English.
- If the user writes in Spanish or mixes languages, you may mirror them naturally — not performatively.
- Reserved terms (*mija*, conversational *onda* / *¿Qué onda?*, *ánimo*, *órale*): only after rapport (multiple sessions / shared personal context) or when the user leads that register. Never on cold first-session English opens. Never assume language or culture from a name or photo.
- Do not use Spanish as a marketing greeting or stereotype.

## AI disclosure
You are AI. Say so clearly when asked, when setting clinical boundaries, or when confidentiality comes up. Conversations are not therapy and are not confidential like clinical care.

## Hard refusals (never)
1. Diagnose or label clinical conditions.
2. Recommend starting/stopping medication or quitting therapy.
3. Romantic or sexual roleplay; do not be a girlfriend/partner.
4. Claim HIPAA or therapy-privilege confidentiality.
5. Shame missed days or broken streaks.
6. Toxic positivity ("just think positive").
7. Specific financial, legal, or medical advice — defer to appropriate professionals.
8. Pretend to be human.

## Crisis and safety (non-negotiable)
If the user expresses suicidal ideation, self-harm intent, wanting to die/disappear permanently, or planning harm:
1. Validate briefly.
2. Stop wellness coaching and Wave planning.
3. Tell them you are not equipped for this.
4. Direct them to call or text 988 (US) and/or visit https://findahelpline.com
5. If immediate danger, tell them to contact local emergency services.
6. Do not ask for methods or details of how they would harm themselves.
7. Do not run therapy theater through the crisis.
You may say you will be here when they are safe. Do not continue a coaching session in crisis.

For medical red flags (e.g. unexplained chest pain, overdose, acute physical emergency): defer to a clinician or emergency services; do not diagnose or prescribe movement/meds.

## Channel style (default = app)
- App: fuller replies OK; still prefer one idea per beat.
- If channel=whatsapp: shorter, conversational fragments OK.
- If channel=sms: one action + one question; keep under ~160 characters when possible.

## Response shape
1. Acknowledge what they said (specific, not generic).
2. Offer one concrete next step OR one focusing question.
3. Stay inside wellness-guide bounds.
4. When building a day/plan, keep it tiny and doable.

You never claim to replace human care. You help them grow on their own terms — one livable step at a time.`;

export function lastUserContent(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content.trim()) {
      return messages[i].content.trim();
    }
  }
  return '';
}

function applyOutputModeration(
  reply: string,
  input: InputClassification,
  mode: ChatReplyMode
): { reply: string; mode: ChatReplyMode } {
  const mod = moderateOutput(reply, input);
  if (mod.ok) return { reply: mod.reply, mode };
  return {
    reply: mod.reply,
    mode: modeForClassification(input),
  };
}

function memoryFact(memoryBlock: string | undefined, key: string): string | undefined {
  if (!memoryBlock) return undefined;
  const re = new RegExp(`- ${key.replace(/\./g, '\\.')}: ([^\\n]+)`);
  const m = memoryBlock.match(re);
  return m?.[1]?.trim();
}

export function stubReply(lastUser: string, memoryBlock?: string): string {
  const trimmed =
    lastUser.length > 120 ? `${lastUser.slice(0, 117).trimEnd()}…` : lastUser;
  const snippet = trimmed.replace(/[.!?]+$/u, '');

  const preferredName = memoryFact(memoryBlock, 'profile.preferred_name');
  const focus = memoryFact(memoryBlock, 'onboarding.focus');
  const nameBit = preferredName ? ` ${preferredName}` : '';

  let focusHint = '';
  if (memoryBlock) {
    const activeWaveMatch = memoryBlock.match(/- Active Wave: ([^\n]+)/);
    const waveMatch = memoryBlock.match(/- Wave: ([^\n]+)/);
    const pillarMatch = memoryBlock.match(/pillar=([a-z-]+)/i);
    const statusStarting = /status=starting/i.test(memoryBlock);
    const todayOpen = /○ /.test(memoryBlock);
    if (activeWaveMatch) {
      const label = activeWaveMatch[1].split(' · ')[0];
      focusHint = todayOpen
        ? ` You're on ${label} — today's tiny actions are waiting when you want them.`
        : ` You're on ${label}.`;
    } else if (statusStarting && waveMatch) {
      focusHint = ` We're starting your First Wave — ${waveMatch[1].split(' · ')[0]}.`;
    } else if (waveMatch) {
      focusHint = ` You're on ${waveMatch[1].split(' · ')[0]}.`;
    } else if (pillarMatch) {
      focusHint = ` You're leaning into ${pillarMatch[1].replace(/-/g, ' ')}.`;
    } else if (focus) {
      focusHint = ` ${focus}`;
    }
  }

  // English-primary first turns — no premature mija / Spanish cosplay in the stub.
  return (
    `I hear you${nameBit} — "${snippet}."${focusHint} ` +
    `Chat is still a Phase 4 stub (no Anthropic key in this environment), so I'm keeping this light. ` +
    `What's one small thing that would make today 5% easier? ` +
    `If you're in crisis, call or text 988 (US) or visit findahelpline.com.`
  );
}

export function parseChatBody(
  raw: unknown
): { ok: true; body: ChatRequestBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'invalid_body' };
  }
  const obj = raw as Record<string, unknown>;
  const messages = obj.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages_required' };
  }

  const normalized: ChatMessage[] = [];
  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'invalid_message' };
    }
    const role = (entry as ChatMessage).role;
    const content = (entry as ChatMessage).content;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      return { ok: false, error: 'invalid_role' };
    }
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, error: 'invalid_content' };
    }
    if (content.length > 8_000) {
      return { ok: false, error: 'content_too_long' };
    }
    normalized.push({ role, content: content.trim() });
  }

  if (normalized.length > 40) {
    return { ok: false, error: 'too_many_messages' };
  }

  if (!normalized.some((m) => m.role === 'user')) {
    return { ok: false, error: 'user_message_required' };
  }

  const wave = parseWaveContext(obj.wave);
  const memoryFacts = parseMemoryFacts(obj.memory);
  const memory = memoryFacts ? { facts: memoryFacts } : undefined;

  return {
    ok: true,
    body: {
      messages: normalized,
      wave,
      memory,
      channel:
        obj.channel === 'whatsapp' || obj.channel === 'sms' || obj.channel === 'app'
          ? obj.channel
          : 'app',
      stream: obj.stream === true,
    },
  };
}

/** True when body.stream or client Accept includes text/event-stream. */
export function wantsStream(request: Request, body: ChatRequestBody): boolean {
  if (body.stream === true) return true;
  const accept = request.headers.get('Accept') ?? '';
  return accept
    .split(',')
    .some((part) => part.trim().toLowerCase().startsWith('text/event-stream'));
}

export function formatSseEvent(payload: ChatStreamEvent): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** Split stub text into small token-like chunks for progressive UI. */
export function chunkTextForStub(text: string, chunkSize = 12): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length);
    // Prefer breaking on whitespace when nearby.
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > i + Math.floor(chunkSize / 2)) {
        end = space + 1;
      }
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicMessagesResponse {
  content?: AnthropicTextBlock[];
  error?: { message?: string };
}

function firstSessionGuidance(memoryBlock?: string): string {
  if (!memoryBlock) return '';
  const hasOnboarding = memoryBlock.includes('onboarding.focus:');
  const waveStarting = /status=starting/i.test(memoryBlock);
  if (!hasOnboarding && !waveStarting) return '';
  return (
    `\n\n## First session\n` +
    `English-primary opener. Do not use *mija*, Spanish-led greetings, or cultural cosplay. ` +
    `If a First Wave / pillar focus is in memory, acknowledge it briefly, then one small next step or question.`
  );
}

export function buildSystemPrompt(channel: string, memoryBlock?: string): string {
  let system = `${ZULY_SYSTEM_PROMPT_V1}\n\n## Channel\nchannel=${channel}`;
  system += firstSessionGuidance(memoryBlock);
  if (memoryBlock) {
    system += `\n\n${memoryBlock}`;
  }
  return system;
}

export async function callAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  channel: string,
  memoryBlock?: string
): Promise<string> {
  const system = buildSystemPrompt(channel, memoryBlock);
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system,
      messages: apiMessages,
    }),
  });

  const data = (await res.json()) as AnthropicMessagesResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? `anthropic_http_${res.status}`;
    throw new Error(msg);
  }

  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!.trim())
    .filter(Boolean)
    .join('\n\n');

  if (!text) {
    throw new Error('empty_anthropic_response');
  }
  return text;
}

export async function callAnthropicStream(
  apiKey: string,
  messages: ChatMessage[],
  channel: string,
  memoryBlock?: string
): Promise<ReadableStream<Uint8Array>> {
  const system = buildSystemPrompt(channel, memoryBlock);
  const apiMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      stream: true,
      system,
      messages: apiMessages,
    }),
  });

  if (!res.ok) {
    let msg = `anthropic_http_${res.status}`;
    try {
      const data = (await res.json()) as AnthropicMessagesResponse;
      if (data.error?.message) msg = data.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  if (!res.body) {
    throw new Error('empty_anthropic_stream');
  }
  return res.body;
}

/**
 * Parse Anthropic Messages SSE and yield text deltas.
 * See https://docs.anthropic.com/en/api/messages-streaming
 */
export async function* iterAnthropicTextDeltas(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const line of parts) {
        const trimmed = line.trimEnd();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        let event: {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        try {
          event = JSON.parse(raw) as typeof event;
        } catch {
          continue;
        }
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          typeof event.delta.text === 'string' &&
          event.delta.text
        ) {
          yield event.delta.text;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamStubReply(
  text: string,
  delayMs = 18
): AsyncGenerator<string> {
  for (const chunk of chunkTextForStub(text)) {
    yield chunk;
    if (delayMs > 0) await sleep(delayMs);
  }
}

/**
 * Resolve reply mode + full text (non-stream). Used by JSON fallback / curl.
 */
function composeMemoryBlock(
  opts?: {
    wave?: WaveContext | null;
    facts?: Array<{ key: string; value: string }>;
    wavePlanBlock?: string;
  },
  body?: ChatRequestBody
): string {
  const base = formatMemoryInjection(
    opts?.wave ?? body?.wave ?? null,
    opts?.facts ?? body?.memory?.facts ?? []
  );
  const plan = opts?.wavePlanBlock?.trim() ?? '';
  if (base && plan) return `${base}\n\n${plan}`;
  return base || plan;
}

export async function generateChatReply(
  body: ChatRequestBody,
  anthropicKey: string | undefined,
  opts?: {
    wave?: WaveContext | null;
    facts?: Array<{ key: string; value: string }>;
    wavePlanBlock?: string;
  }
): Promise<{ reply: string; mode: ChatReplyMode }> {
  const lastUser = lastUserContent(body.messages);
  const input = classifyInput(lastUser);

  if (input.blockGeneration && input.templateReply) {
    return {
      reply: input.templateReply,
      mode: modeForClassification(input),
    };
  }

  const memoryBlock = composeMemoryBlock(opts, body);

  if (anthropicKey) {
    const reply = await callAnthropic(
      anthropicKey,
      body.messages,
      body.channel ?? 'app',
      memoryBlock || undefined
    );
    return applyOutputModeration(reply, input, 'anthropic');
  }

  const stub = stubReply(lastUser, memoryBlock || undefined);
  return applyOutputModeration(stub, input, 'stub');
}

export type ChatReplyStreamPart =
  | { type: 'meta'; mode: ChatReplyMode }
  | { type: 'delta'; text: string }
  | { type: 'complete'; reply: string; mode: ChatReplyMode };

/**
 * Yields `{ meta }` then text deltas then `{ complete, reply, mode }`.
 * Crisis: one full delta; stub: simulated tokens; Anthropic: Messages stream API.
 */
export async function* generateChatReplyStream(
  body: ChatRequestBody,
  anthropicKey: string | undefined,
  opts?: {
    wave?: WaveContext | null;
    facts?: Array<{ key: string; value: string }>;
    wavePlanBlock?: string;
  }
): AsyncGenerator<ChatReplyStreamPart> {
  const lastUser = lastUserContent(body.messages);
  const input = classifyInput(lastUser);

  if (input.blockGeneration && input.templateReply) {
    const mode = modeForClassification(input);
    const reply = input.templateReply;
    yield { type: 'meta', mode };
    yield { type: 'delta', text: reply };
    yield { type: 'complete', reply, mode };
    return;
  }

  const memoryBlock = composeMemoryBlock(opts, body);

  if (anthropicKey) {
    // Buffer Anthropic tokens, then moderate — avoid flashing unsafe deltas.
    const upstream = await callAnthropicStream(
      anthropicKey,
      body.messages,
      body.channel ?? 'app',
      memoryBlock || undefined
    );
    let raw = '';
    for await (const delta of iterAnthropicTextDeltas(upstream)) {
      raw += delta;
    }
    if (!raw.trim()) {
      throw new Error('empty_anthropic_response');
    }
    const { reply, mode } = applyOutputModeration(raw, input, 'anthropic');
    yield { type: 'meta', mode };
    for await (const delta of streamStubReply(reply)) {
      yield { type: 'delta', text: delta };
    }
    yield { type: 'complete', reply, mode };
    return;
  }

  const stub = stubReply(lastUser, memoryBlock || undefined);
  const { reply, mode } = applyOutputModeration(stub, input, 'stub');
  yield { type: 'meta', mode };
  for await (const delta of streamStubReply(reply)) {
    yield { type: 'delta', text: delta };
  }
  yield { type: 'complete', reply, mode };
}
