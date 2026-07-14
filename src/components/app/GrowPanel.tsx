/**
 * Grow tab — Wave week progress, week-4 complete action, and shame-free celebration.
 * Reads GET /api/wave; completes via POST /api/wave/complete; next Wave via POST /api/wave.
 */

import { useCallback, useEffect, useState } from 'react';

interface DayPlanItem {
  id: string;
  text: string;
  pillar: string;
  done: boolean;
}

interface WeekBrief {
  week: number;
  theme: string;
  focus: string;
}

interface WavePayload {
  id: number;
  label: string;
  primary_pillar: string;
  pillars?: string[];
  week: number;
  status: string;
  started_at?: string;
  ends_at?: string | null;
  week_theme?: string;
  week_focus?: string;
  week_check_in?: string;
  weeks?: WeekBrief[];
}

interface TodayPayload {
  id: number;
  date: string;
  items: DayPlanItem[];
  status: string;
}

interface CelebrationPayload {
  headline: string;
  body: string;
  wave_id: number;
  label: string;
  primary_pillar: string;
  pillars: string[];
}

interface GrowPanelProps {
  getToken?: () => Promise<string | null>;
  refreshKey?: number;
}

type PillarId = 'meditation' | 'self-healing' | 'body' | 'life-guidance';

const WAVE_WEEKS = 4;

const PILLAR_OPTIONS: Array<{ id: PillarId; label: string }> = [
  { id: 'meditation', label: 'Meditation' },
  { id: 'self-healing', label: 'Self-healing' },
  { id: 'body', label: 'Body' },
  { id: 'life-guidance', label: 'Life guidance' },
];

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

function shortTheme(theme: string | undefined, fallback: string): string {
  if (!theme) return fallback;
  return theme.length > 28 ? `${theme.slice(0, 26).trimEnd()}…` : theme;
}

function dismissKey(waveId: number): string {
  return `hz_wave_celebrate_dismiss_${waveId}`;
}

export function GrowPanel({ getToken, refreshKey = 0 }: GrowPanelProps) {
  const [wave, setWave] = useState<WavePayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(
    null
  );
  const [completedWave, setCompletedWave] = useState<WavePayload | null>(null);
  const [canComplete, setCanComplete] = useState(false);
  const [nextCheckin, setNextCheckin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showPillarPick, setShowPillarPick] = useState(false);
  const [nextPillars, setNextPillars] = useState<PillarId[]>([]);
  const [actionNote, setActionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const headers = authHeaders(token);
      const res = await fetch('/api/wave', { method: 'GET', headers });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(
          data.hint
            ? String(data.hint)
            : 'Could not load Wave progress. Try Talk or finish getting started.'
        );
        setWave(null);
        setToday(null);
        setCelebration(null);
        setCompletedWave(null);
        setCanComplete(false);
        setNextCheckin('');
        return;
      }

      const active = (data.wave as WavePayload | null) ?? null;
      const celeb = (data.celebration as CelebrationPayload | null) ?? null;
      const doneWave = (data.completed_wave as WavePayload | null) ?? null;

      setWave(active);
      setToday(data.today ?? null);
      setCanComplete(data.can_complete === true);
      setCompletedWave(doneWave);
      setCelebration(celeb);

      if (celeb?.wave_id) {
        try {
          setDismissed(
            sessionStorage.getItem(dismissKey(celeb.wave_id)) === '1'
          );
        } catch {
          setDismissed(false);
        }
        setNextPillars(
          (celeb.pillars?.filter((p): p is PillarId =>
            PILLAR_OPTIONS.some((o) => o.id === p)
          ) ?? [celeb.primary_pillar as PillarId]).slice(0, 2)
        );
      } else {
        setDismissed(false);
        setShowPillarPick(false);
      }

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
      setError('Network error loading Grow.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const togglePillar = (id: PillarId) => {
    setNextPillars((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [prev[0]!, id];
      return [...prev, id];
    });
  };

  const completeWave = async () => {
    setBusy(true);
    setActionNote('');
    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch('/api/wave/complete', {
        method: 'POST',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionNote(
          data.hint
            ? String(data.hint)
            : 'Could not complete Wave yet — week 4 first is fine.'
        );
        return;
      }
      await load();
    } catch {
      setActionNote('Network error completing Wave.');
    } finally {
      setBusy(false);
    }
  };

  const startNextWave = async (pillars: PillarId[]) => {
    if (!pillars.length) return;
    setBusy(true);
    setActionNote('');
    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch('/api/wave', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ pillars }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setActionNote(
          data.hint ? String(data.hint) : 'Could not start the next Wave.'
        );
        return;
      }
      setShowPillarPick(false);
      setCelebration(null);
      await load();
    } catch {
      setActionNote('Network error starting next Wave.');
    } finally {
      setBusy(false);
    }
  };

  const dismissCelebration = () => {
    if (celebration?.wave_id) {
      try {
        sessionStorage.setItem(dismissKey(celebration.wave_id), '1');
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  };

  if (loading) {
    return (
      <section className="grow-panel" aria-busy="true">
        <p className="grow-loading">Loading your Wave…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="grow-panel">
        <p className="grow-error">{error}</p>
      </section>
    );
  }

  const showCelebration = Boolean(celebration) && !wave && !dismissed;
  const finished = completedWave ?? (celebration ? {
    id: celebration.wave_id,
    label: celebration.label,
    primary_pillar: celebration.primary_pillar,
    pillars: celebration.pillars,
    week: 4,
    status: 'completed',
  } : null);

  if (!wave && !showCelebration && !finished) {
    return (
      <section className="grow-panel">
        <p className="grow-kicker">Grow</p>
        <h2 className="grow-title">Your Wave will show here</h2>
        <p className="grow-lead">
          Finish getting started (or open Talk) so we can seed your First Wave.
          Progress is gentle — weeks bend, nothing to fail.
        </p>
      </section>
    );
  }

  if (showCelebration && celebration) {
    return (
      <section
        className="grow-panel grow-panel--celebrate"
        aria-labelledby="grow-celebrate-title"
      >
        <p className="grow-kicker">Grow · Wave complete</p>
        <h2 id="grow-celebrate-title" className="grow-title">
          {celebration.headline}
        </h2>
        <p className="grow-celebrate-body">{celebration.body}</p>
        <p className="grow-meta">
          {celebration.label} · {pillarLabel(celebration.primary_pillar)} ·
          finished, not grinding
        </p>

        <div className="grow-celebrate-actions" role="group" aria-label="Soft next steps">
          <button
            type="button"
            className="grow-btn grow-btn--ghost"
            disabled={busy}
            onClick={dismissCelebration}
          >
            Enjoy the finish
          </button>
          <button
            type="button"
            className="grow-btn grow-btn--soft"
            disabled={busy || !celebration.pillars?.length}
            onClick={() =>
              void startNextWave(
                (celebration.pillars?.filter((p): p is PillarId =>
                  PILLAR_OPTIONS.some((o) => o.id === p)
                ) ?? [celebration.primary_pillar as PillarId]).slice(0, 2)
              )
            }
          >
            Same pillars, soft start
          </button>
          <button
            type="button"
            className="grow-btn grow-btn--soft"
            disabled={busy}
            onClick={() => setShowPillarPick((v) => !v)}
            aria-expanded={showPillarPick}
          >
            Choose pillars later-ish
          </button>
        </div>

        {showPillarPick ? (
          <div className="grow-next-pillars" role="group" aria-label="Next Wave pillars">
            <p className="grow-lead">
              Pick 1 or 2 — whenever you&apos;re ready. No catch-up, no guilt.
            </p>
            <div className="grow-pillar-chips">
              {PILLAR_OPTIONS.map((opt) => {
                const active = nextPillars.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`grow-pillar-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    disabled={busy}
                    onClick={() => togglePillar(opt.id)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="grow-btn grow-btn--soft"
              disabled={busy || nextPillars.length < 1}
              onClick={() => void startNextWave(nextPillars)}
            >
              Start a soft next Wave
            </button>
          </div>
        ) : null}

        {actionNote ? <p className="grow-error">{actionNote}</p> : null}
        <p className="grow-footnote">
          Missed days didn&apos;t erase this. Rest is part of the season.
        </p>
      </section>
    );
  }

  if (!wave) {
    return (
      <section className="grow-panel">
        <p className="grow-kicker">Grow</p>
        <h2 className="grow-title">
          {finished?.label ?? 'Wave complete'}
        </h2>
        <p className="grow-lead">
          You finished a Wave. When you want another, pick soft start from Talk
          or come back here — no deadline.
        </p>
        <button
          type="button"
          className="grow-btn grow-btn--soft"
          disabled={busy}
          onClick={() => {
            setDismissed(false);
            if (celebration) setCelebration(celebration);
            else if (finished) {
              setCelebration({
                headline: 'Four weeks showing up',
                body: "That's not luck — that's you. No reinvention speech needed. Want to keep a lighter rhythm, start a new Wave later, or just enjoy the finish for a minute?",
                wave_id: finished.id,
                label: finished.label,
                primary_pillar: finished.primary_pillar,
                pillars: finished.pillars ?? [finished.primary_pillar],
              });
            }
          }}
        >
          Soft next Wave options
        </button>
        {actionNote ? <p className="grow-error">{actionNote}</p> : null}
      </section>
    );
  }

  const week = Math.min(Math.max(1, wave.week || 1), WAVE_WEEKS);
  const weekTheme = wave.week_theme ?? `Week ${week}`;
  const weekFocus =
    wave.week_focus ??
    'Tiny practices that fit a real day — Waves bend, nothing to fail.';
  const items = today?.items ?? [];
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = total > 0 && doneCount === total;

  return (
    <section className="grow-panel" aria-labelledby="grow-title">
      <p className="grow-kicker">Grow · Wave progress</p>
      <h2 id="grow-title" className="grow-title">
        {wave.label}
      </h2>
      <p className="grow-meta">
        Week {week} of {WAVE_WEEKS} · {pillarLabel(wave.primary_pillar)} ·{' '}
        {wave.status === 'active' || wave.status === 'starting'
          ? 'growing, not grinding'
          : wave.status}
      </p>

      {canComplete ? (
        <div className="grow-complete-banner" role="region" aria-label="Wave complete option">
          <p className="grow-complete-copy">
            Week 4 is here. You can mark this Wave complete whenever it feels
            done — no reinvent speech, no pressure to start the next one.
          </p>
          <button
            type="button"
            className="grow-btn grow-btn--soft"
            disabled={busy}
            onClick={() => void completeWave()}
          >
            Complete this Wave
          </button>
        </div>
      ) : null}

      <div className="grow-week-now" aria-labelledby="grow-week-theme">
        <h3 id="grow-week-theme" className="grow-week-theme">
          {weekTheme}
        </h3>
        <p className="grow-week-focus">{weekFocus}</p>
        {wave.week_check_in ? (
          <p className="grow-week-checkin">
            Soft check-in: {wave.week_check_in}
          </p>
        ) : null}
      </div>

      <ol className="grow-weeks" aria-label={`Wave weeks, currently week ${week}`}>
        {Array.from({ length: WAVE_WEEKS }, (_, i) => {
          const n = i + 1;
          const state =
            n < week ? 'past' : n === week ? 'current' : 'ahead';
          const brief = wave.weeks?.find((w) => w.week === n);
          return (
            <li
              key={n}
              className={`grow-week grow-week--${state}`}
              aria-current={n === week ? 'step' : undefined}
              title={brief?.focus ?? brief?.theme}
            >
              <span className="grow-week-num">{n}</span>
              <span className="grow-week-label">
                {shortTheme(
                  brief?.theme,
                  n < week ? 'Done-ish' : n === week ? 'Here' : 'Ahead'
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grow-today">
        <h3 className="grow-today-label">Today</h3>
        {total === 0 ? (
          <p className="grow-lead">
            No day plan yet — open Talk or Today to build a tiny plan.
          </p>
        ) : (
          <>
            <p className="grow-today-stat">
              {doneCount} of {total} tiny actions checked
              {allDone ? ' — you showed up.' : '.'}
            </p>
            <ul className="grow-today-items">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`grow-today-item${item.done ? ' is-done' : ''}`}
                >
                  <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {nextCheckin ? (
        <p className="grow-checkin" aria-label="Next check-in estimate">
          Next check-in: {nextCheckin}
        </p>
      ) : null}

      {actionNote ? <p className="grow-error">{actionNote}</p> : null}

      <p className="grow-footnote">
        Missed days don&apos;t erase the Wave. Talk when you&apos;re ready —
        we&apos;ll rebuild the day.
      </p>
    </section>
  );
}
