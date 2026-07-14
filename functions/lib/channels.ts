/**
 * Channel text helpers — SMS (≤160) and WhatsApp-friendly truncation/split.
 * No Meta / Twilio API calls; used when formatting stub nudge bodies.
 */

export const SMS_SEGMENT_CHARS = 160;
/** Soft WA paragraph comfort; Meta templates are separate / vendor-blocked. */
export const WA_SOFT_MAX_CHARS = 4096;
/** Prefer short proactive nudges even when the WA hard cap is higher. */
export const WA_NUDGE_TARGET_CHARS = 300;

export function truncateForSms(text: string, max = SMS_SEGMENT_CHARS): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  if (max <= 1) return '…';
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Split into GSM-ish SMS segments (plain length, no UDH accounting).
 * Empty input → [].
 */
export function splitSmsSegments(
  text: string,
  max = SMS_SEGMENT_CHARS
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= max) return [cleaned];

  const parts: string[] = [];
  let rest = cleaned;
  while (rest.length > 0) {
    if (rest.length <= max) {
      parts.push(rest);
      break;
    }
    let cut = max;
    const window = rest.slice(0, max);
    const space = window.lastIndexOf(' ');
    if (space >= Math.floor(max * 0.5)) {
      cut = space;
    }
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return parts;
}

export function truncateForWhatsApp(
  text: string,
  max = WA_NUDGE_TARGET_CHARS
): string {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  const hard = Math.min(max, WA_SOFT_MAX_CHARS);
  if (cleaned.length <= hard) return cleaned;
  if (hard <= 1) return '…';
  return `${cleaned.slice(0, hard - 1).trimEnd()}…`;
}

/** Format a proactive check-in body for the chosen channel (stub only). */
export function formatNudgeBodyForChannel(
  body: string,
  channel: 'app' | 'email' | 'sms' | 'whatsapp'
): { text: string; segments?: string[] } {
  if (channel === 'sms') {
    const segments = splitSmsSegments(body);
    return { text: segments[0] ?? '', segments };
  }
  if (channel === 'whatsapp') {
    return { text: truncateForWhatsApp(body) };
  }
  // app / email — keep short but not SMS-hard
  const cleaned = body.replace(/\s+/g, ' ').trim();
  return {
    text:
      cleaned.length > 280
        ? `${cleaned.slice(0, 279).trimEnd()}…`
        : cleaned,
  };
}
