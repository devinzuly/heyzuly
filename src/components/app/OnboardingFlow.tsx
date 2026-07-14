import { useCallback, useState } from 'react';

type PillarId = 'meditation' | 'self-healing' | 'body' | 'life-guidance';
type CheckinRhythm = 'daily_light' | 'few_times_week' | 'when_open';

type MicroStep = 'disclosure' | 'name' | 'pillars' | 'rhythm';
type SurveyStep = 'survey_intro' | 'g1' | 'g2' | 's1' | 's2' | 's3';
type Step = MicroStep | SurveyStep;

const PILLAR_OPTIONS: Array<{ id: PillarId; label: string; hint: string }> = [
  { id: 'meditation', label: 'Meditation', hint: 'Short daily stillness' },
  { id: 'self-healing', label: 'Self-healing', hint: 'Reflection & reframes' },
  { id: 'body', label: 'Body', hint: 'Gentle movement' },
  { id: 'life-guidance', label: 'Life', hint: 'Work, habits, people' },
];

const RHYTHM_OPTIONS: Array<{ id: CheckinRhythm; label: string; hint: string }> = [
  {
    id: 'daily_light',
    label: 'Daily, light',
    hint: 'A soft touch most days — nothing heavy.',
  },
  {
    id: 'few_times_week',
    label: 'A few times a week',
    hint: 'Check in when it matters, not on a grind.',
  },
  {
    id: 'when_open',
    label: 'When I open the app',
    hint: "I'll meet you when you show up.",
  },
];

/** Soft-launch pack — exact copy from Onboarding-Survey-Spec §3.0 / §3.2 */
const SEASON_OPTIONS = [
  'Stretching at work',
  'Healing something heavy',
  'Getting my body back',
  'Straightening life/relationships',
  'A mix / unsure',
] as const;

const HARD_WINDOW_OPTIONS = [
  'Mornings',
  'Midday',
  'Evenings',
  'Late night',
  'It depends',
] as const;

const HEAL_THEME_OPTIONS = [
  'Rumination / replaying',
  'Self-criticism',
  'Overwhelm',
  'Low mood stretch',
  'Conflict hangover',
  'Numb / flat',
  'Other',
] as const;

const HEAL_MODE_OPTIONS = [
  'Write privately',
  'Talk it out with Zuly',
  'Mix',
  'Small actions first, words later',
] as const;

const HEAL_ENERGY_OPTIONS = [
  '2 min',
  '5–10',
  '15+',
  'Only when I need it',
] as const;

type SeasonLabel = (typeof SEASON_OPTIONS)[number];
type HardWindow = (typeof HARD_WINDOW_OPTIONS)[number];
type HealTheme = (typeof HEAL_THEME_OPTIONS)[number];
type HealMode = (typeof HEAL_MODE_OPTIONS)[number];
type HealEnergy = (typeof HEAL_ENERGY_OPTIONS)[number];

interface OnboardingFlowProps {
  getToken?: () => Promise<string | null>;
  onComplete: () => void;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function includesSelfHealing(pillars: PillarId[]): boolean {
  return pillars.includes('self-healing');
}

function microStepIndex(step: MicroStep): number {
  return step === 'disclosure' ? 0 : step === 'name' ? 1 : step === 'pillars' ? 2 : 3;
}

function surveyProgress(step: SurveyStep): string {
  if (step === 'survey_intro') return 'Optional prefs';
  const order: SurveyStep[] = ['g1', 'g2', 's1', 's2', 's3'];
  const i = order.indexOf(step);
  return `Optional · ${i + 1} of 5`;
}

export function OnboardingFlow({ getToken, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('disclosure');
  const [preferredName, setPreferredName] = useState('');
  const [pillars, setPillars] = useState<PillarId[]>([]);
  const [rhythm, setRhythm] = useState<CheckinRhythm | null>(null);
  const [seasonLabel, setSeasonLabel] = useState<SeasonLabel | null>(null);
  const [hardWindow, setHardWindow] = useState<HardWindow | null>(null);
  const [healThemes, setHealThemes] = useState<HealTheme[]>([]);
  const [healMode, setHealMode] = useState<HealMode | null>(null);
  const [healEnergy, setHealEnergy] = useState<HealEnergy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePillar = useCallback((id: PillarId) => {
    setPillars((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }, []);

  const toggleHealTheme = useCallback((theme: HealTheme) => {
    setHealThemes((prev) => {
      if (prev.includes(theme)) return prev.filter((t) => t !== theme);
      if (prev.length >= 2) return [...prev.slice(1), theme];
      return [...prev, theme];
    });
  }, []);

  const finish = useCallback(
    async (includeSurvey: boolean) => {
      if (!rhythm || pillars.length < 1) return;
      setSubmitting(true);
      setError('');

      try {
        const token = getToken ? await getToken() : null;
        const body: Record<string, unknown> = {
          preferred_name: preferredName.trim() || undefined,
          pillars,
          rhythm,
        };

        if (includeSurvey) {
          const survey: Record<string, unknown> = {};
          if (seasonLabel) survey.season_label = seasonLabel;
          if (hardWindow) survey.hard_window = hardWindow;
          if (healThemes.length) survey.heal_theme = healThemes;
          if (healMode) survey.heal_mode = healMode;
          if (healEnergy) survey.heal_energy = healEnergy;
          if (Object.keys(survey).length) body.survey = survey;
        }

        const res = await fetch('/api/users/onboarding', {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(
            data.error === 'unauthorized'
              ? 'Could not save — set CHAT_DEV_BYPASS=true in .dev.vars or sign in.'
              : 'Could not save your preferences. Try again.'
          );
          return;
        }

        onComplete();
      } catch {
        setError('Network error — try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      getToken,
      healEnergy,
      healMode,
      healThemes,
      hardWindow,
      onComplete,
      pillars,
      preferredName,
      rhythm,
      seasonLabel,
    ]
  );

  const afterRhythm = useCallback(() => {
    if (includesSelfHealing(pillars)) {
      setStep('survey_intro');
      return;
    }
    void finish(false);
  }, [finish, pillars]);

  /** Skip completes onboarding; keeps any survey answers already chosen. */
  const skipSurvey = useCallback(() => {
    void finish(true);
  }, [finish]);

  const isSurvey =
    step === 'survey_intro' ||
    step === 'g1' ||
    step === 'g2' ||
    step === 's1' ||
    step === 's2' ||
    step === 's3';

  const kicker = isSurvey
    ? surveyProgress(step)
    : `Getting started · ${microStepIndex(step) + 1} of 4`;

  return (
    <div
      className="onboard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <div className="onboard-card">
        <p className="onboard-kicker">{kicker}</p>

        {step === 'disclosure' ? (
          <>
            <h2 id="onboard-title">Zuly is an AI wellness guide</h2>
            <ul className="onboard-list">
              <li>
                She supports your growth — she is <strong>not a therapist</strong> or
                clinician.
              </li>
              <li>
                Conversations are AI-generated and are not confidential like therapy.
              </li>
              <li>
                If you&apos;re in crisis, call or text{' '}
                <a href="tel:988" className="crisis-link">
                  988
                </a>{' '}
                (US) or visit{' '}
                <a
                  href="https://findahelpline.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  findahelpline.com
                </a>
                .
              </li>
            </ul>
            <button
              type="button"
              className="btn btn-gold onboard-btn"
              onClick={() => setStep('name')}
            >
              I understand — continue
            </button>
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <h2 id="onboard-title">What should I call you?</h2>
            <p className="onboard-lead">
              Optional — first name or a nickname is enough. We&apos;ll keep this
              warm and in English for now.
            </p>
            <label className="sr-only" htmlFor="onboard-name">
              Preferred name
            </label>
            <input
              id="onboard-name"
              className="onboard-input"
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Preferred name (optional)"
              maxLength={40}
              autoComplete="nickname"
            />
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={() => setStep('disclosure')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-gold onboard-btn-primary"
                onClick={() => setStep('pillars')}
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === 'pillars' ? (
          <>
            <h2 id="onboard-title">Where do you want to start?</h2>
            <p className="onboard-lead">Pick 1 or 2 pillars — not all four at once.</p>
            <div className="onboard-chips" role="group" aria-label="Pillars">
              {PILLAR_OPTIONS.map((opt) => {
                const active = pillars.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => togglePillar(opt.id)}
                  >
                    <span className="onboard-chip-label">{opt.label}</span>
                    <span className="onboard-chip-hint">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={() => setStep('name')}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-gold onboard-btn-primary"
                disabled={pillars.length < 1}
                onClick={() => setStep('rhythm')}
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === 'rhythm' ? (
          <>
            <h2 id="onboard-title">How often should I check in?</h2>
            <p className="onboard-lead">
              Preference only — Waves bend; nothing to earn or fail.
            </p>
            <div className="onboard-chips" role="radiogroup" aria-label="Check-in rhythm">
              {RHYTHM_OPTIONS.map((opt) => {
                const active = rhythm === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRhythm(opt.id)}
                  >
                    <span className="onboard-chip-label">{opt.label}</span>
                    <span className="onboard-chip-hint">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            {error && !includesSelfHealing(pillars) ? (
              <p className="onboard-error">{error}</p>
            ) : null}
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={() => setStep('pillars')}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-gold onboard-btn-primary"
                disabled={!rhythm || submitting}
                onClick={() => afterRhythm()}
              >
                {submitting
                  ? 'Saving…'
                  : includesSelfHealing(pillars)
                    ? 'Continue'
                    : 'Start talking'}
              </button>
            </div>
          </>
        ) : null}

        {step === 'survey_intro' ? (
          <>
            <h2 id="onboard-title">Want a few quick prefs?</h2>
            <p className="onboard-lead">
              These aren&apos;t a test. They help me build a day you can actually do
              — preferences only, not a diagnosis.
            </p>
            <p className="onboard-footer-note">
              Practices draw on mindfulness, CBT-style skills, and habit research. I&apos;m
              still an AI guide, not a clinician.
            </p>
            {error ? <p className="onboard-error">{error}</p> : null}
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={skipSurvey}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Skip for now'}
              </button>
              <button
                type="button"
                className="btn btn-gold onboard-btn-primary"
                disabled={submitting}
                onClick={() => setStep('g1')}
              >
                5 quick questions
              </button>
            </div>
            <button
              type="button"
              className="onboard-skip-link"
              onClick={() => setStep('rhythm')}
              disabled={submitting}
            >
              Back
            </button>
          </>
        ) : null}

        {step === 'g1' ? (
          <>
            <h2 id="onboard-title">What season are you in right now?</h2>
            <p className="onboard-lead">Pick one — frames how we talk about growth.</p>
            <div className="onboard-chips" role="radiogroup" aria-label="Season">
              {SEASON_OPTIONS.map((opt) => {
                const active = seasonLabel === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSeasonLabel(opt)}
                  >
                    <span className="onboard-chip-label">{opt}</span>
                  </button>
                );
              })}
            </div>
            <SurveyNav
              submitting={submitting}
              error={error}
              canContinue={Boolean(seasonLabel)}
              onBack={() => setStep('survey_intro')}
              onSkip={skipSurvey}
              onContinue={() => setStep('g2')}
            />
          </>
        ) : null}

        {step === 'g2' ? (
          <>
            <h2 id="onboard-title">
              When is life usually hardest to show up for yourself?
            </h2>
            <p className="onboard-lead">Helps place check-ins when they fit.</p>
            <div className="onboard-chips" role="radiogroup" aria-label="Hard window">
              {HARD_WINDOW_OPTIONS.map((opt) => {
                const active = hardWindow === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setHardWindow(opt)}
                  >
                    <span className="onboard-chip-label">{opt}</span>
                  </button>
                );
              })}
            </div>
            <SurveyNav
              submitting={submitting}
              error={error}
              canContinue={Boolean(hardWindow)}
              onBack={() => setStep('g1')}
              onSkip={skipSurvey}
              onContinue={() => setStep('s1')}
            />
          </>
        ) : null}

        {step === 's1' ? (
          <>
            <h2 id="onboard-title">What&apos;s weighing on you most lately?</h2>
            <p className="onboard-lead">
              Theme, not diagnosis — pick up to two.
            </p>
            <div className="onboard-chips" role="group" aria-label="Themes">
              {HEAL_THEME_OPTIONS.map((opt) => {
                const active = healThemes.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => toggleHealTheme(opt)}
                  >
                    <span className="onboard-chip-label">{opt}</span>
                  </button>
                );
              })}
            </div>
            <SurveyNav
              submitting={submitting}
              error={error}
              canContinue={healThemes.length >= 1}
              onBack={() => setStep('g2')}
              onSkip={skipSurvey}
              onContinue={() => setStep('s2')}
            />
          </>
        ) : null}

        {step === 's2' ? (
          <>
            <h2 id="onboard-title">How do you prefer to process?</h2>
            <p className="onboard-lead">Write, talk, mix, or small actions first.</p>
            <div className="onboard-chips" role="radiogroup" aria-label="Process mode">
              {HEAL_MODE_OPTIONS.map((opt) => {
                const active = healMode === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setHealMode(opt)}
                  >
                    <span className="onboard-chip-label">{opt}</span>
                  </button>
                );
              })}
            </div>
            <SurveyNav
              submitting={submitting}
              error={error}
              canContinue={Boolean(healMode)}
              onBack={() => setStep('s1')}
              onSkip={skipSurvey}
              onContinue={() => setStep('s3')}
            />
          </>
        ) : null}

        {step === 's3' ? (
          <>
            <h2 id="onboard-title">Energy for reflection most days?</h2>
            <p className="onboard-lead">Keeps practice short enough to keep.</p>
            <div className="onboard-chips" role="radiogroup" aria-label="Reflection energy">
              {HEAL_ENERGY_OPTIONS.map((opt) => {
                const active = healEnergy === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`onboard-chip${active ? ' is-active' : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setHealEnergy(opt)}
                  >
                    <span className="onboard-chip-label">{opt}</span>
                  </button>
                );
              })}
            </div>
            {error ? <p className="onboard-error">{error}</p> : null}
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={() => setStep('s2')}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-ghost onboard-btn-secondary"
                onClick={skipSurvey}
                disabled={submitting}
              >
                Skip
              </button>
              <button
                type="button"
                className="btn btn-gold onboard-btn-primary"
                disabled={!healEnergy || submitting}
                onClick={() => void finish(true)}
              >
                {submitting ? 'Saving…' : 'Start talking'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SurveyNav({
  submitting,
  error,
  canContinue,
  onBack,
  onSkip,
  onContinue,
}: {
  submitting: boolean;
  error: string;
  canContinue: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      {error ? <p className="onboard-error">{error}</p> : null}
      <div className="onboard-actions">
        <button
          type="button"
          className="btn btn-ghost onboard-btn-secondary"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-ghost onboard-btn-secondary"
          onClick={onSkip}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Skip'}
        </button>
        <button
          type="button"
          className="btn btn-gold onboard-btn-primary"
          disabled={!canContinue || submitting}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
      <p className="onboard-skip-hint">Skip for now — we can learn as we talk.</p>
    </>
  );
}
