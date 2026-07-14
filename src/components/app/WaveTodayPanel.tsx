/**
 * Light Wave + today’s tiny actions panel for AppShell.
 * Growth language; missed items stay shame-free.
 */

import { useCallback, useEffect, useState } from 'react';

interface DayPlanItem {
  id: string;
  text: string;
  pillar: string;
  done: boolean;
}

interface WavePayload {
  id: number;
  label: string;
  primary_pillar: string;
  week: number;
  status: string;
}

interface TodayPayload {
  id: number;
  date: string;
  items: DayPlanItem[];
  status: string;
}

interface WaveTodayPanelProps {
  getToken?: () => Promise<string | null>;
  /** Bump after onboarding so we refetch / ensure Wave. */
  refreshKey?: number;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function pillarLabel(id: string): string {
  const map: Record<string, string> = {
    meditation: 'Meditation',
    'self-healing': 'Self-healing',
    body: 'Body',
    'life-guidance': 'Life guidance',
  };
  return map[id] ?? id;
}

export function WaveTodayPanel({ getToken, refreshKey = 0 }: WaveTodayPanelProps) {
  const [wave, setWave] = useState<WavePayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const applyBundle = useCallback(
    (data: { wave?: WavePayload | null; today?: TodayPayload | null }) => {
      setWave(data.wave ?? null);
      setToday(data.today ?? null);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const headers = authHeaders(token);

      let res = await fetch('/api/wave', { method: 'GET', headers });
      let data = await res.json();

      if (res.ok && data.ok && !data.wave) {
        res = await fetch('/api/wave', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        data = await res.json();
      } else if (res.ok && data.ok && data.wave && !data.today) {
        res = await fetch('/api/wave/today', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        data = await res.json();
      }

      if (!res.ok || !data.ok) {
        if (data.error === 'wave_prefs_missing') {
          setWave(null);
          setToday(null);
          setHint('Finish getting started to open your First Wave.');
          return;
        }
        setError(
          data.hint
            ? String(data.hint)
            : 'Could not load your Wave. Try again after migrating D1.'
        );
        return;
      }

      applyBundle(data);
      setHint('');
    } catch {
      setError('Network error loading your Wave.');
    } finally {
      setLoading(false);
    }
  }, [applyBundle, getToken]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const toggleItem = useCallback(
    async (item: DayPlanItem) => {
      if (busy) return;
      setBusy(true);
      setError('');
      setHint('');
      try {
        const token = getToken ? await getToken() : null;
        const res = await fetch('/api/wave/today', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ item_id: item.id, done: !item.done }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError('Could not update that step.');
          return;
        }
        applyBundle(data);
        if (item.done) {
          setHint('Okay — still on your Wave. Soft restart anytime.');
        } else if (data.today?.status === 'done') {
          setHint('Nice showing up today. That’s enough.');
        } else {
          setHint('One step counts. The rest can wait.');
        }
      } catch {
        setError('Network error updating your plan.');
      } finally {
        setBusy(false);
      }
    },
    [applyBundle, busy, getToken]
  );

  const rebuildToday = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch('/api/wave/today', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('Could not rebuild today’s plan.');
        return;
      }
      applyBundle(data);
      setHint('Fresh tiny actions — pick what fits today.');
    } catch {
      setError('Network error rebuilding today’s plan.');
    } finally {
      setBusy(false);
    }
  }, [applyBundle, busy, getToken]);

  const downloadIcs = useCallback(async () => {
    if (busy || !today?.items.length) return;
    setBusy(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/wave/today.ics', {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let hint = 'Could not build a calendar file.';
        try {
          const data = await res.json();
          if (data?.hint) hint = String(data.hint);
        } catch {
          // non-JSON error body
        }
        setError(hint);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/i.exec(disposition);
      const filename = match?.[1] ?? `heyzuly-today-${today.date}.ics`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setHint('Calendar file ready — import into Google or Apple Calendar.');
    } catch {
      setError('Network error downloading the calendar file.');
    } finally {
      setBusy(false);
    }
  }, [busy, getToken, today]);

  if (loading) {
    return (
      <section className="wave-today" aria-busy="true">
        <p className="wave-today-loading">Loading your Wave…</p>
      </section>
    );
  }

  if (!wave) {
    return (
      <section className="wave-today wave-today-empty">
        <p className="wave-today-kicker">Your Wave</p>
        <p className="wave-today-empty-copy">
          {hint || 'Your First Wave will show up here after you pick a focus.'}
        </p>
        {error ? <p className="wave-today-error">{error}</p> : null}
      </section>
    );
  }

  const openCount = today?.items.filter((i) => !i.done).length ?? 0;
  const doneCount = today?.items.filter((i) => i.done).length ?? 0;

  return (
    <section className="wave-today" aria-label="Current Wave and today plan">
      <header className="wave-today-head">
        <div>
          <p className="wave-today-kicker">Current Wave</p>
          <h2 className="wave-today-title">{wave.label}</h2>
          <p className="wave-today-meta">
            Week {wave.week} · {pillarLabel(wave.primary_pillar)} · growing, not grinding
          </p>
        </div>
        <div className="wave-today-actions">
          <button
            type="button"
            className="wave-today-rebuild"
            onClick={() => void rebuildToday()}
            disabled={busy}
          >
            Refresh today
          </button>
          {today?.items.length ? (
            <button
              type="button"
              className="wave-today-ics"
              onClick={() => void downloadIcs()}
              disabled={busy}
            >
              Add to calendar
            </button>
          ) : null}
        </div>
      </header>

      <div className="wave-today-plan">
        <p className="wave-today-plan-label">Today · tiny actions</p>
        {today?.items.length ? (
          <ul className="wave-today-items">
            {today.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`wave-today-item${item.done ? ' is-done' : ''}`}
                  aria-pressed={item.done}
                  disabled={busy}
                  onClick={() => void toggleItem(item)}
                >
                  <span className="wave-today-check" aria-hidden="true">
                    {item.done ? '✓' : ''}
                  </span>
                  <span className="wave-today-item-text">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="wave-today-empty-copy">No plan yet — refresh to build today.</p>
        )}
        {doneCount > 0 && openCount > 0 ? (
          <p className="wave-today-miss">
            Left some for later? Fine — Waves bend. Come back when you can.
          </p>
        ) : null}
        {today?.status === 'done' ? (
          <p className="wave-today-miss">You showed up. That’s the growth.</p>
        ) : null}
      </div>

      {hint ? <p className="wave-today-hint">{hint}</p> : null}
      {error ? <p className="wave-today-error">{error}</p> : null}
    </section>
  );
}
