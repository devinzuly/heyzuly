/**
 * You tab — profile from user_facts + Settings (nudges) + Channels shell + legal.
 */

import { useCallback, useEffect, useState } from 'react';
import { SoftNotice } from './SoftNotice';

interface FactRow {
  key: string;
  value: string;
  source?: string;
}

interface YouPanelProps {
  getToken?: () => Promise<string | null>;
  refreshKey?: number;
  /** DevAppShell / PUBLIC_CHAT_DEV_BYPASS */
  localStressTest?: boolean;
  onOpenHelp?: () => void;
}

type YouView = 'home' | 'settings' | 'channels';

const PILLAR_LABELS: Record<string, string> = {
  meditation: 'Meditation',
  'self-healing': 'Self-healing',
  body: 'Body',
  'life-guidance': 'Life guidance',
};

const RHYTHM_LABELS: Record<string, string> = {
  daily_light: 'Daily, light check-ins',
  few_times_week: 'A few times a week',
  when_open: 'When I open the app',
};

const SURVEY_PREFIXES = ['heal.', 'med.', 'body.', 'life.', 'season.', 'rhythm.'];

const CHANNELS: Array<{ id: string; title: string; meta: string }> = [
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    meta: 'Voice & chat with Zuly on WhatsApp — coming later. App stays the private home for now.',
  },
  {
    id: 'sms',
    title: 'SMS',
    meta: 'Quick capture by text — planned. Nothing to connect yet.',
  },
  {
    id: 'email',
    title: 'Email',
    meta: 'Soft check-in reminders by email — waitlisted until send path is live.',
  },
];

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function factMap(facts: FactRow[]): Map<string, string> {
  return new Map(facts.map((f) => [f.key, f.value]));
}

function pillarLabel(id: string): string {
  return PILLAR_LABELS[id] ?? id;
}

function rhythmLabel(raw: string): string {
  return RHYTHM_LABELS[raw] ?? raw;
}

function humanizeKey(key: string): string {
  return key
    .replace(/^(heal|med|body|life|season|rhythm)\./, '')
    .replace(/_/g, ' ');
}

function parseNudgesEnabled(map: Map<string, string>): boolean {
  const raw = map.get('settings.nudges_enabled')?.trim().toLowerCase();
  if (raw == null || raw === '') return true;
  return !(raw === 'false' || raw === '0' || raw === 'no' || raw === 'off');
}

export function YouPanel({
  getToken,
  refreshKey = 0,
  localStressTest = false,
  onOpenHelp,
}: YouPanelProps) {
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<YouView>('home');
  const [busy, setBusy] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken ? await getToken() : null;
      const [memRes, inviteRes] = await Promise.all([
        fetch('/api/memory', {
          method: 'GET',
          headers: authHeaders(token),
        }),
        fetch('/api/invite/status'),
      ]);
      const data = await memRes.json();
      try {
        const inviteData = await inviteRes.json();
        if (inviteRes.ok && inviteData.ok) {
          setInviteRequired(Boolean(inviteData.invite_required));
        }
      } catch {
        // Access row stays hidden if status probe fails
      }
      if (!memRes.ok || !data.ok) {
        setError(
          data.hint
            ? String(data.hint)
            : 'Couldn’t load your profile just now. Nothing’s gone — try again.'
        );
        setFacts([]);
        return;
      }
      const next = (data.prefs?.facts as FactRow[]) ?? [];
      setFacts(next);
      const preferred =
        next.find((f) => f.key === 'profile.preferred_name')?.value?.trim() ||
        '';
      setNameDraft(preferred);
    } catch {
      setError(
        'Network blip loading You. Take a breath — try again when you’re ready.'
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const postFacts = async (entries: Array<{ key: string; value: string }>) => {
    const token = getToken ? await getToken() : null;
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ facts: entries }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(
        data.hint ? String(data.hint) : 'Could not save. Try again in a moment.'
      );
    }
    setFacts((data.prefs?.facts as FactRow[]) ?? []);
  };

  const toggleNudges = async (enabled: boolean) => {
    setBusy(true);
    setActionNote('');
    try {
      await postFacts([
        { key: 'settings.nudges_enabled', value: enabled ? 'true' : 'false' },
      ]);
      setActionNote(
        enabled
          ? 'Check-in reminders stay on (soft cadence from your rhythm).'
          : 'Check-in reminders paused. You can turn them back on anytime.'
      );
    } catch (err) {
      setActionNote(
        err instanceof Error ? err.message : 'Could not save reminder setting.'
      );
    } finally {
      setBusy(false);
    }
  };

  const savePreferredName = async () => {
    const value = nameDraft.trim().slice(0, 64);
    if (!value) {
      setActionNote('Add a short name you like Zuly to use.');
      return;
    }
    setBusy(true);
    setActionNote('');
    try {
      await postFacts([{ key: 'profile.preferred_name', value }]);
      setActionNote('Preferred name saved.');
    } catch (err) {
      setActionNote(
        err instanceof Error ? err.message : 'Could not save preferred name.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="you-panel" aria-busy="true">
        <SoftNotice tone="loading">Loading your profile…</SoftNotice>
      </section>
    );
  }

  const map = factMap(facts);
  const preferred =
    map.get('profile.preferred_name')?.trim() || 'Friend';
  const primary = map.get('pillar.primary')?.trim();
  const focus = map.get('onboarding.focus')?.trim();
  const rhythmRaw =
    map.get('rhythm.checkin')?.trim() ||
    map.get('rhythm.hard_window')?.trim();
  const rhythm = rhythmRaw
    ? map.get('rhythm.checkin')
      ? rhythmLabel(rhythmRaw)
      : rhythmRaw
    : '';
  const season = map.get('season.label')?.trim();
  const nudgesOn = parseNudgesEnabled(map);

  const pillarDisplay = primary
    ? pillarLabel(primary)
    : focus
      ? focus
      : 'Not set yet — finish getting started or talk with Zuly.';

  const surveyBits = facts
    .filter((f) =>
      SURVEY_PREFIXES.some(
        (p) =>
          f.key.startsWith(p) &&
          f.key !== 'rhythm.checkin' &&
          f.key !== 'rhythm.hard_window' &&
          f.key !== 'season.label'
      )
    )
    .slice(0, 8);

  if (view === 'settings') {
    return (
      <section className="you-panel" aria-labelledby="you-settings-title">
        <button
          type="button"
          className="you-back"
          onClick={() => {
            setView('home');
            setActionNote('');
          }}
        >
          ← You
        </button>
        <p className="you-kicker">Settings</p>
        <h2 id="you-settings-title" className="you-title">
          Your soft defaults
        </h2>
        <p className="you-lead">
          Small preferences only — nothing to optimize. Waves bend around real
          days.
        </p>

        <div className="you-setting">
          <div className="you-setting-text">
            <p className="you-row-title">Check-in reminders</p>
            <p className="you-row-meta">
              Soft nudges from your rhythm (app stub today). Off means the due
              check skips you — no guilt, no streak.
            </p>
          </div>
          <button
            type="button"
            className={`you-toggle${nudgesOn ? ' is-on' : ''}`}
            role="switch"
            aria-checked={nudgesOn}
            disabled={busy}
            onClick={() => void toggleNudges(!nudgesOn)}
          >
            <span className="you-toggle-knob" aria-hidden="true" />
            <span className="you-toggle-label">{nudgesOn ? 'On' : 'Off'}</span>
          </button>
        </div>

        <div className="you-name-edit">
          <label className="you-section-label" htmlFor="you-preferred-name">
            Preferred name
          </label>
          <div className="you-name-row">
            <input
              id="you-preferred-name"
              className="you-name-input"
              type="text"
              maxLength={64}
              value={nameDraft}
              disabled={busy}
              onChange={(e) => setNameDraft(e.target.value)}
              autoComplete="nickname"
            />
            <button
              type="button"
              className="you-btn you-btn--soft"
              disabled={busy}
              onClick={() => void savePreferredName()}
            >
              Save
            </button>
          </div>
        </div>

        {actionNote ? <p className="you-note">{actionNote}</p> : null}
        {error ? (
          <SoftNotice tone="error" onRetry={() => void load()}>
            {error}
          </SoftNotice>
        ) : null}
      </section>
    );
  }

  if (view === 'channels') {
    return (
      <section className="you-panel" aria-labelledby="you-channels-title">
        <button
          type="button"
          className="you-back"
          onClick={() => {
            setView('home');
            setActionNote('');
          }}
        >
          ← You
        </button>
        <p className="you-kicker">Channels</p>
        <h2 id="you-channels-title" className="you-title">
          Where Zuly can meet you
        </h2>
        <p className="you-lead">
          In-app first. Other channels are planned — nothing to wire yet, and no
          Meta/Twilio setup required to use Hey Zuly today.
        </p>
        <div className="you-rows" role="list">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="you-row" role="listitem">
              <div>
                <p className="you-row-title">{ch.title}</p>
                <p className="you-row-meta">{ch.meta}</p>
              </div>
              <span className="you-row-badge">Coming soon</span>
            </div>
          ))}
        </div>
        <p className="you-footnote">
          Want reminders now? Use Settings → Check-in reminders (app stub).
        </p>
      </section>
    );
  }

  return (
    <section className="you-panel" aria-labelledby="you-title">
      {localStressTest ? (
        <p className="you-dev-banner" role="status">
          Local stress-test mode — no Clerk; API uses CHAT_DEV_BYPASS.
        </p>
      ) : null}

      <p className="you-kicker">You</p>
      <h2 id="you-title" className="you-title">
        {preferred}
      </h2>
      <p className="you-lead">A light map of what we’ve kept for your Waves.</p>

      {error ? (
        <SoftNotice tone="error" onRetry={() => void load()}>
          {error}
        </SoftNotice>
      ) : null}

      <dl className="you-facts">
        <div className="you-fact">
          <dt>Preferred name</dt>
          <dd>{preferred}</dd>
        </div>
        <div className="you-fact">
          <dt>Pillars</dt>
          <dd>
            {pillarDisplay}
            {primary && focus ? (
              <span className="you-fact-sub"> · {focus}</span>
            ) : null}
          </dd>
        </div>
        <div className="you-fact">
          <dt>Rhythm</dt>
          <dd>{rhythm || 'Not set yet'}</dd>
        </div>
        <div className="you-fact">
          <dt>Season</dt>
          <dd>{season || 'Not set yet'}</dd>
        </div>
        <div className="you-fact">
          <dt>Check-in reminders</dt>
          <dd>{nudgesOn ? 'On' : 'Paused'}</dd>
        </div>
        {inviteRequired != null ? (
          <div className="you-fact">
            <dt>Access</dt>
            <dd>
              {inviteRequired ? (
                <>
                  Early access · invited
                  <span className="you-fact-sub">
                    {' '}
                    · Soft launch is invite-only
                  </span>
                </>
              ) : (
                <>
                  Open
                  <span className="you-fact-sub">
                    {' '}
                    · Invite gate off for now
                  </span>
                </>
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      {surveyBits.length ? (
        <div className="you-survey">
          <h3 className="you-section-label">Survey notes</h3>
          <ul className="you-survey-list">
            {surveyBits.map((f) => (
              <li key={f.key}>
                <span className="you-survey-key">{humanizeKey(f.key)}</span>
                <span className="you-survey-val">{f.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="you-rows" role="list">
        {onOpenHelp ? (
          <button
            type="button"
            className="you-row you-row--btn"
            role="listitem"
            onClick={onOpenHelp}
          >
            <div>
              <p className="you-row-title">Help &amp; crisis</p>
              <p className="you-row-meta">
                988 · findahelpline · FAQ · support@heyzuly.com
              </p>
            </div>
            <span className="you-row-badge">Open</span>
          </button>
        ) : null}
        <button
          type="button"
          className="you-row you-row--btn"
          role="listitem"
          onClick={() => {
            setView('channels');
            setActionNote('');
          }}
        >
          <div>
            <p className="you-row-title">Channels</p>
            <p className="you-row-meta">WhatsApp, SMS, Email — coming soon</p>
          </div>
          <span className="you-row-badge">Open</span>
        </button>
        <button
          type="button"
          className="you-row you-row--btn"
          role="listitem"
          onClick={() => {
            setView('settings');
            setActionNote('');
          }}
        >
          <div>
            <p className="you-row-title">Settings</p>
            <p className="you-row-meta">
              Reminders {nudgesOn ? 'on' : 'paused'} · preferred name
            </p>
          </div>
          <span className="you-row-badge">Open</span>
        </button>
      </div>

      <nav className="you-legal" aria-label="Legal">
        <a href="/privacy">Privacy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms</a>
      </nav>

      <p className="you-footnote">
        Sign-out lives in the header when you’re on Clerk. Zuly is an AI wellness
        guide, not a therapist.
      </p>
    </section>
  );
}
