const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function minuteWindow(): number {
  return Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
}

export async function isRateLimited(
  db: D1Database,
  ipHash: string
): Promise<boolean> {
  const windowStart = minuteWindow();
  const row = await db
    .prepare(
      'SELECT request_count FROM rate_limits WHERE ip_hash = ? AND window_start = ?'
    )
    .bind(ipHash, windowStart)
    .first<{ request_count: number }>();

  if (row && row.request_count >= RATE_LIMIT_MAX) {
    return true;
  }

  await db
    .prepare(
      `INSERT INTO rate_limits (ip_hash, window_start, request_count)
       VALUES (?, ?, 1)
       ON CONFLICT(ip_hash, window_start)
       DO UPDATE SET request_count = request_count + 1`
    )
    .bind(ipHash, windowStart)
    .run();

  return false;
}

export function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
