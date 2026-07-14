/**
 * Wave + today’s tiny actions for AppShell.
 * Full variant powers the Today tab; compact strips Talk without duplicating the list.
 * Growth language; missed items stay shame-free.
 */

import { useCallback, useEffect, useState } from 'react';
import { SoftNotice } from './SoftNotice';

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
  week_theme?: string;
  week_focus?: string;
  week_check_in?: string;
  week_seed?: string;
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
  /** `full` = Today tab; `compact` = Talk strip with Open Today. */
  variant?: 'full' | 'compact';
  onOpenToday?: () => void;
  /** Prefer Talk when prefs / onboarding still need a soft finish. */
  onOpenTalk?: () => void;
  /** Open Talk with a soft week check-in / practice starter in the draft. */
  onPracticeWithZuly?: (prompt: string) => void;
}

function practiceSkipKey(waveId: number, week: number): string {
  return `hz-practice-skip:${waveId}:w${week}`;
}

function isPracticeSkipped(waveId: number, week: number): boolean {
  try {
    return sessionStorage.getItem(practiceSkipKey(waveId, week)) === '1';
  } catch {
    return false;
  }
}

function skipPractice(waveId: number, week: number): void {
  try {
    sessionStorage.setItem(practiceSkipKey(waveId, week), '1');
  } catch {
    // private mode — card may reappear this session
  }
}

/** Soft starter for Talk — check-in first; seed as a tiny-practice fallback. */
function buildPracticeDraft(wave: WavePayload): string {
  const checkIn = wave.week_check_in?.trim();
  if (checkIn) {
    return `Can we practice together? ${checkIn}`;
  }
  const seed = wave.week_seed?.trim();
  if (seed) {
    return `I'd like to try this tiny practice: ${seed}`;
  }
  return '';
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

export function WaveTodayPanel({
  getToken,
  refreshKey = 0,
  variant = 'full',
  onOpenToday,
  onOpenTalk,
  onPracticeWithZuly,
}: WaveTodayPanelProps) {
  const [wave, setWave] = useState<WavePayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [nextCheckin, setNextCheckin] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [practiceHidden, setPracticeHidden] = useState(false);
  const compact = variant === 'compact';

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

      // Compact Talk strip: read-only; Today tab ensures Wave/plan.
      if (!compact) {
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
            : 'Your Wave didn’t load — nothing’s lost. Try again in a moment.'
        );
        return;
      }

      applyBundle(data);
      setHint('');

      try {
        const nudgeRes = await fetch('/api/nudges', { method: 'GET', headers });
        const nudgeData = await nudgeRes.json();
        if (nudgeRes.ok && nudgeData.ok && nudgeData.next_checkin?.label) {
          setNextCheckin(String(nudgeData.next_checkin.label));
        } else {
          setNextCheckin('');
        }
      } catch {
        setNextCheckin('');
      }
    } catch {
      setError(
        'Network blip loading your Wave. Take a breath — try again when you’re ready.'
      );
    } finally {
      setLoading(false);
    }
  }, [applyBundle, compact, getToken]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!wave) {
      setPracticeHidden(false);
      return;
    }
    setPracticeHidden(isPracticeSkipped(wave.id, wave.week));
  }, [wave]);

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
          setError('Couldn’t update that step. Soft retry when you’re ready.');
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
        setError(
          'Network blip updating your plan. Nothing’s erased — try again.'
        );
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
        setError('Couldn’t refresh today’s plan. Try again in a moment.');
        return;
      }
      applyBundle(data);
      setHint('Fresh tiny actions — pick what fits today.');
    } catch {
      setError(
        'Network blip refreshing today. Your Wave is still here — try again.'
      );
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
      <section
        className={`wave-today${compact ? ' wave-today--compact' : ''}`}
        aria-busy="true"
      >
        <SoftNotice tone="loading">Loading your Wave…</SoftNotice>
      </section>
    );
  }

  if (error && !wave) {
    return (
      <section
        className={`wave-today${compact ? ' wave-today--compact' : ''}`}
      >
        <p className="wave-today-kicker">{compact ? 'Today' : 'Your Wave'}</p>
        <SoftNotice tone="error" onRetry={() => void load()}>
          {error}
        </SoftNotice>
      </section>
    );
  }

  if (!wave) {
    const needsOnboarding =
      Boolean(hint) && /getting started|First Wave/i.test(hint);
    return (
      <section
        className={`wave-today wave-today-empty${compact ? ' wave-today--compact' : ''}`}
      >
        {!compact ? (
          <div className="wave-today-empty-art" aria-hidden="true">
            <svg viewBox="0 0 96 64" width="96" height="64" fill="none">
              <path
                d="M8 40c10-14 22-22 36-22s26 8 36 22"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M18 44c8-10 17-15 30-15s22 5 30 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.35"
              />
              <circle cx="48" cy="22" r="3.2" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
        ) : null}
        <p className="wave-today-kicker">{compact ? 'Today' : 'Your Wave'}</p>
        <h2 className="wave-today-empty-title">
          {needsOnboarding ? 'Almost ready for a Wave' : 'No Wave yet'}
        </h2>
        <p className="wave-today-empty-copy">
          {hint ||
            'Your First Wave will show up here when you’re ready — no streak required.'}
        </p>
        <div className="wave-today-empty-actions">
          {needsOnboarding && onOpenTalk ? (
            <button
              type="button"
              className="wave-today-cta"
              onClick={onOpenTalk}
            >
              Finish getting started
            </button>
          ) : null}
          {!needsOnboarding && !compact ? (
            <button
              type="button"
              className="wave-today-cta"
              onClick={() => void load()}
            >
              Start First Wave
            </button>
          ) : null}
          {compact && onOpenToday ? (
            <button
              type="button"
              className="wave-today-open"
              onClick={onOpenToday}
            >
              Open Today
            </button>
          ) : null}
        </div>
        {error ? (
          <SoftNotice tone="error" onRetry={() => void load()}>
            {error}
          </SoftNotice>
        ) : null}
      </section>
    );
  }

  const openCount = today?.items.filter((i) => !i.done).length ?? 0;
  const doneCount = today?.items.filter((i) => i.done).length ?? 0;
  const total = today?.items.length ?? 0;
  const practiceDraft = buildPracticeDraft(wave);
  const showPractice =
    Boolean(onPracticeWithZuly) && Boolean(practiceDraft) && !practiceHidden;

  const practiceCard = showPractice ? (
    <div className={`wave-practice${compact ? ' wave-practice--compact' : ''}`}>
      <p className="wave-practice-kicker">Optional · Practice with Zuly</p>
      {wave.week_theme ? (
        <p className="wave-practice-theme">{wave.week_theme}</p>
      ) : null}
      <p className="wave-practice-prompt">
        {wave.week_check_in?.trim() || wave.week_seed?.trim()}
      </p>
      {wave.week_focus && !compact ? (
        <p className="wave-practice-focus">{wave.week_focus}</p>
      ) : null}
      <div className="wave-practice-actions">
        <button
          type="button"
          className="wave-practice-go"
          onClick={() => onPracticeWithZuly?.(practiceDraft)}
        >
          Practice with Zuly
        </button>
        <button
          type="button"
          className="wave-practice-skip"
          onClick={() => {
            skipPractice(wave.id, wave.week);
            setPracticeHidden(true);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <section
        className="wave-today wave-today--compact"
        aria-label="Today plan snapshot"
      >
        <div className="wave-today-compact-row">
          <div>
            <p className="wave-today-kicker">Today</p>
            <p className="wave-today-compact-title">{wave.label}</p>
            <p className="wave-today-meta">
              Week {wave.week} ·{' '}
              {total
                ? `${doneCount} of ${total} tiny actions`
                : 'No plan yet — open Today to build one'}
            </p>
            {nextCheckin ? (
              <p className="wave-today-checkin">Next check-in: {nextCheckin}</p>
            ) : null}
          </div>
          {onOpenToday ? (
            <button
              type="button"
              className="wave-today-open"
              onClick={onOpenToday}
            >
              Open Today
            </button>
          ) : null}
        </div>
        {practiceCard}
        {error ? (
          <SoftNotice tone="error" onRetry={() => void load()}>
            {error}
          </SoftNotice>
        ) : null}
      </section>
    );
  }

  return (
    <section className="wave-today" aria-label="Current Wave and today plan">
      <header className="wave-today-head">
        <div>
          <p className="wave-today-kicker">Today</p>
          <h2 className="wave-today-title">{wave.label}</h2>
          <p className="wave-today-meta">
            Week {wave.week} · {pillarLabel(wave.primary_pillar)} · growing, not grinding
          </p>
          {nextCheckin ? (
            <p className="wave-today-checkin">Next check-in: {nextCheckin}</p>
          ) : null}
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

      {practiceCard}

      <div className="wave-today-plan">
        <p className="wave-today-plan-label">Tiny actions</p>
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
      {error ? (
        <SoftNotice tone="error" onRetry={() => void load()}>
          {error}
        </SoftNotice>
      ) : null}
    </section>
  );
}
