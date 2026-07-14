/**
 * Plan tab — active Wave overview (weeks 1–4, theme/focus, ends_at).
 * Soft complete / next Wave reuse Grow APIs; lighter than Grow celebration.
 */

import { useCallback, useEffect, useState } from 'react';
import { SoftNotice } from './SoftNotice';

interface WeekBrief {
  week: number;
  theme: string;
  focus: string;
}

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

interface HistoryDay {
  date: string;
  status: string | null;
  has_plan: boolean;
  done_count: number;
  open_count: number;
  item_count: number;
  summary: string[];
}

interface PlanPanelProps {
  getToken?: () => Promise<string | null>;
  refreshKey?: number;
  onOpenTalk?: () => void;
  onOpenGrow?: () => void;
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

function formatEndsAt(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHistoryDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function historyStatusLabel(day: HistoryDay): string {
  if (!day.has_plan) return 'Open day';
  if (day.status === 'done' || (day.item_count > 0 && day.open_count === 0)) {
    return 'Done';
  }
  if (day.status === 'skipped') return 'Skipped gently';
  if (day.done_count > 0 && day.open_count > 0) {
    return `${day.done_count} done · ${day.open_count} open`;
  }
  if (day.open_count > 0) return 'Open';
  return day.status === 'open' ? 'Open' : 'Light touch';
}

export function PlanPanel({
  getToken,
  refreshKey = 0,
  onOpenTalk,
  onOpenGrow,
}: PlanPanelProps) {
  const [wave, setWave] = useState<WavePayload | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(
    null
  );
  const [canComplete, setCanComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [nextPillars, setNextPillars] = useState<PillarId[]>([]);
  const [showPillarPick, setShowPillarPick] = useState(false);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [historyError, setHistoryError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setHistoryError('');
    try {
      const token = getToken ? await getToken() : null;
      const headers = authHeaders(token);
      const [waveRes, histRes] = await Promise.all([
        fetch('/api/wave', { method: 'GET', headers }),
        fetch('/api/wave/history?days=7', { method: 'GET', headers }),
      ]);
      const data = await waveRes.json();
      const histData = await histRes.json().catch(() => null);

      if (!waveRes.ok || !data.ok) {
        setError(
          data.hint
            ? String(data.hint)
            : 'Your plan didn’t load — nothing’s lost. Try again, or open Talk.'
        );
        setWave(null);
        setToday(null);
        setCelebration(null);
        setCanComplete(false);
        setHistory([]);
        return;
      }

      const active = (data.wave as WavePayload | null) ?? null;
      const celeb = (data.celebration as CelebrationPayload | null) ?? null;

      setWave(active);
      setToday(data.today ?? null);
      setCanComplete(data.can_complete === true);
      setCelebration(celeb);

      if (histRes.ok && histData?.ok && Array.isArray(histData.history)) {
        setHistory(histData.history as HistoryDay[]);
      } else {
        setHistory([]);
        setHistoryError(
          'Couldn’t load your last-7-days glance. Your Wave is still here — try again.'
        );
      }

      if (celeb?.pillars?.length) {
        setNextPillars(
          celeb.pillars
            .filter((p): p is PillarId =>
              PILLAR_OPTIONS.some((o) => o.id === p)
            )
            .slice(0, 2)
        );
      } else {
        setNextPillars([]);
        setShowPillarPick(false);
      }
    } catch {
      setError(
        'Network blip loading Plan. Take a breath — try again when you’re ready.'
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

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

  const togglePillar = (id: PillarId) => {
    setNextPillars((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [prev[0]!, id];
      return [...prev, id];
    });
  };

  if (loading) {
    return (
      <section className="plan-panel" aria-busy="true">
        <SoftNotice tone="loading">Loading your Wave plan…</SoftNotice>
      </section>
    );
  }

  if (error) {
    return (
      <section className="plan-panel">
        <p className="plan-kicker">Plan</p>
        <SoftNotice tone="error" onRetry={() => void load()}>
          {error}
        </SoftNotice>
      </section>
    );
  }

  if (!wave && celebration) {
    return (
      <section className="plan-panel" aria-labelledby="plan-title">
        <p className="plan-kicker">Plan · Wave complete</p>
        <h2 id="plan-title" className="plan-title">
          {celebration.headline}
        </h2>
        <p className="plan-lead">{celebration.body}</p>
        <p className="plan-meta">
          {celebration.label} · {pillarLabel(celebration.primary_pillar)}
        </p>
        <div className="plan-actions" role="group" aria-label="Soft next Wave">
          <button
            type="button"
            className="plan-btn plan-btn--soft"
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
            className="plan-btn plan-btn--ghost"
            disabled={busy}
            onClick={() => setShowPillarPick((v) => !v)}
            aria-expanded={showPillarPick}
          >
            Choose pillars
          </button>
          {onOpenGrow ? (
            <button
              type="button"
              className="plan-btn plan-btn--ghost"
              onClick={onOpenGrow}
            >
              Open Grow
            </button>
          ) : null}
        </div>
        {showPillarPick ? (
          <div className="plan-pillar-pick" role="group" aria-label="Next Wave pillars">
            <div className="plan-pillar-chips">
              {PILLAR_OPTIONS.map((opt) => {
                const active = nextPillars.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`plan-pillar-chip${active ? ' is-active' : ''}`}
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
              className="plan-btn plan-btn--soft"
              disabled={busy || nextPillars.length < 1}
              onClick={() => void startNextWave(nextPillars)}
            >
              Start a soft next Wave
            </button>
          </div>
        ) : null}
        {actionNote ? <p className="plan-error">{actionNote}</p> : null}
      </section>
    );
  }

  if (!wave) {
    return (
      <section className="plan-panel">
        <p className="plan-kicker">Plan</p>
        <h2 className="plan-title">Your Wave plan will land here</h2>
        <p className="plan-lead">
          Finish getting started (or open Talk) so we can seed your First Wave.
          Weeks bend — nothing to fail.
        </p>
        {onOpenTalk ? (
          <button type="button" className="plan-btn plan-btn--soft" onClick={onOpenTalk}>
            Talk → build today
          </button>
        ) : null}
        {historyError ? (
          <SoftNotice tone="error" onRetry={() => void load()}>
            {historyError}
          </SoftNotice>
        ) : null}
        {history.length ? (
          <div className="plan-history" aria-labelledby="plan-history-title">
            <h3 id="plan-history-title" className="plan-section-label">
              Last 7 days
            </h3>
            <p className="plan-lead">
              A soft look back — blank days don’t erase anything.
            </p>
            <ul className="plan-history-list">
              {history.map((day) => {
                const state = !day.has_plan
                  ? 'empty'
                  : day.status === 'done' ||
                      (day.item_count > 0 && day.open_count === 0)
                    ? 'done'
                    : 'open';
                return (
                  <li
                    key={day.date}
                    className={`plan-history-day plan-history-day--${state}`}
                  >
                    <div className="plan-history-day-head">
                      <span className="plan-history-date">
                        {formatHistoryDate(day.date)}
                      </span>
                      <span className="plan-history-badge">
                        {historyStatusLabel(day)}
                      </span>
                    </div>
                    {day.has_plan && day.summary.length ? (
                      <p className="plan-history-summary">
                        {day.summary.join(' · ')}
                      </p>
                    ) : (
                      <p className="plan-history-summary plan-history-summary--empty">
                        No plan saved — rest counts too.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    );
  }

  const week = Math.min(Math.max(1, wave.week || 1), WAVE_WEEKS);
  const weekTheme = wave.week_theme ?? `Week ${week}`;
  const weekFocus =
    wave.week_focus ??
    'Tiny practices that fit a real day — Waves bend, nothing to fail.';
  const endsLabel = formatEndsAt(wave.ends_at);
  const currentSeeds =
    wave.weeks?.find((w) => w.week === week) ??
    ({ week, theme: weekTheme, focus: weekFocus } as WeekBrief);
  const todayItems = today?.items ?? [];

  return (
    <section className="plan-panel" aria-labelledby="plan-title">
      <p className="plan-kicker">Plan · active Wave</p>
      <h2 id="plan-title" className="plan-title">
        {wave.label}
      </h2>
      <p className="plan-meta">
        Week {week} of {WAVE_WEEKS} · {pillarLabel(wave.primary_pillar)}
        {endsLabel ? ` · soft end ~${endsLabel}` : ''}
      </p>

      {canComplete ? (
        <div className="plan-complete-banner" role="region" aria-label="Soft Wave complete">
          <p className="plan-lead">
            Week 4 is here. Mark this Wave complete when it feels done — no
            pressure to start the next one.
          </p>
          <button
            type="button"
            className="plan-btn plan-btn--soft"
            disabled={busy}
            onClick={() => void completeWave()}
          >
            Soft-complete this Wave
          </button>
        </div>
      ) : null}

      <div className="plan-week-now" aria-labelledby="plan-week-theme">
        <h3 id="plan-week-theme" className="plan-week-theme">
          {weekTheme}
        </h3>
        <p className="plan-lead">{weekFocus}</p>
        {wave.week_check_in ? (
          <p className="plan-checkin">Soft check-in: {wave.week_check_in}</p>
        ) : null}
      </div>

      <ol className="plan-weeks" aria-label={`Wave weeks, currently week ${week}`}>
        {Array.from({ length: WAVE_WEEKS }, (_, i) => {
          const n = i + 1;
          const state = n < week ? 'past' : n === week ? 'current' : 'ahead';
          const brief = wave.weeks?.find((w) => w.week === n);
          return (
            <li
              key={n}
              className={`plan-week plan-week--${state}`}
              aria-current={n === week ? 'step' : undefined}
              title={brief?.focus ?? brief?.theme}
            >
              <span className="plan-week-num">{n}</span>
              <span className="plan-week-label">
                {shortTheme(
                  brief?.theme,
                  n < week ? 'Done-ish' : n === week ? 'Here' : 'Ahead'
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="plan-day-block">
        <h3 className="plan-section-label">This week’s seeds</h3>
        <p className="plan-lead">
          <strong>{currentSeeds.theme}</strong> — {currentSeeds.focus}
        </p>
        {todayItems.length ? (
          <>
            <p className="plan-section-label plan-section-label--sub">Today’s plan</p>
            <ul className="plan-day-items">
              {todayItems.map((item) => (
                <li
                  key={item.id}
                  className={`plan-day-item${item.done ? ' is-done' : ''}`}
                >
                  <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="plan-lead">
            No day plan for today yet — open Talk when you want one tiny seed.
            Empty days are fine.
          </p>
        )}
        {onOpenTalk ? (
          <button
            type="button"
            className="plan-btn plan-btn--soft"
            onClick={onOpenTalk}
          >
            Talk → build today
          </button>
        ) : null}
      </div>

      <div className="plan-history" aria-labelledby="plan-history-title">
        <h3 id="plan-history-title" className="plan-section-label">
          Last 7 days
        </h3>
        <p className="plan-lead">
          A soft look back — blank days don’t erase the Wave.
        </p>
        {historyError ? (
          <SoftNotice tone="error" onRetry={() => void load()}>
            {historyError}
          </SoftNotice>
        ) : history.length ? (
          <ul className="plan-history-list">
            {history.map((day) => {
              const state = !day.has_plan
                ? 'empty'
                : day.status === 'done' ||
                    (day.item_count > 0 && day.open_count === 0)
                  ? 'done'
                  : 'open';
              return (
                <li
                  key={day.date}
                  className={`plan-history-day plan-history-day--${state}`}
                >
                  <div className="plan-history-day-head">
                    <span className="plan-history-date">
                      {formatHistoryDate(day.date)}
                    </span>
                    <span className="plan-history-badge">{historyStatusLabel(day)}</span>
                  </div>
                  {day.has_plan && day.summary.length ? (
                    <p className="plan-history-summary">
                      {day.summary.join(' · ')}
                    </p>
                  ) : (
                    <p className="plan-history-summary plan-history-summary--empty">
                      No plan saved — rest counts too.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="plan-lead">
            Week history will show here once you’ve built a day or two. Nothing
            to catch up on.
          </p>
        )}
      </div>

      {actionNote ? (
        <SoftNotice tone="error" onRetry={() => void load()}>
          {actionNote}
        </SoftNotice>
      ) : null}

      <p className="plan-footnote">
        Missed days don’t erase the Wave. Grow holds the richer celebration when
        you soft-complete.
      </p>
    </section>
  );
}
