import { jsonResponse } from '../../lib/waitlist';

function getExportSecret(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const url = new URL(request.url);
  return url.searchParams.get('secret');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const expected = env.WAITLIST_EXPORT_SECRET;

  if (!expected) {
    return jsonResponse(
      {
        ok: false,
        error: 'export_disabled',
        hint: 'Set WAITLIST_EXPORT_SECRET in Pages env, or query D1 manually.',
      },
      503
    );
  }

  const provided = getExportSecret(request);
  if (!provided || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, email, created_at, source, utm_json, ip_hash
     FROM waitlist
     ORDER BY created_at ASC`
  ).all();

  const accept = request.headers.get('Accept') || '';
  if (accept.includes('text/csv')) {
    const header = 'id,email,created_at,source,utm_json,ip_hash\n';
    const rows = (results ?? [])
      .map((row) => {
        const r = row as Record<string, unknown>;
        return [
          r.id,
          r.email,
          r.created_at,
          r.source,
          r.utm_json ?? '',
          r.ip_hash ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    return new Response(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waitlist-export.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  return jsonResponse({ ok: true, count: results?.length ?? 0, rows: results ?? [] });
};
