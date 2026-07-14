import { useCallback, useMemo, useState } from 'react';

type PillarId = 'meditation' | 'self-healing' | 'body' | 'life-guidance';
type CheckinRhythm = 'daily_light' | 'few_times_week' | 'when_open';

type MicroStep = 'disclosure' | 'name' | 'pillars' | 'rhythm';
type SurveyStepId =
  | 'survey_intro'
  | 'g1'
  | 'g2'
  | 's1'
  | 's2'
  | 's3'
  | 'm1'
  | 'm2'
  | 'b1'
  | 'b2'
  | 'l1'
  | 'l2'
  | 'l3';
type Step = MicroStep | SurveyStepId;

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

/** Soft-launch packs — copy from Onboarding-Survey-Spec §3 */
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

const MED_LENGTH_OPTIONS = [
  '2 min',
  '5',
  '10',
  '15+',
  'Not sure yet',
] as const;

const MED_EXPERIENCE_OPTIONS = [
  'Brand new',
  'Tried apps, fell off',
  'Decent habit',
  'Love it but inconsistent',
] as const;

const BODY_MODALITY_OPTIONS = [
  'Walk',
  'Stretch / mobility',
  'Strength lite',
  'Dance / fun',
  'Yoga-ish',
  'Mix',
  'Rest-first for now',
] as const;

const BODY_CAPACITY_OPTIONS = [
  'Low energy',
  'Okay if short',
  'Ready to build',
  'Recovery / pain — go easy',
  'Prefer not to say',
] as const;

const LIFE_DOMAIN_OPTIONS = [
  'Work / career',
  'Relationships',
  'Home / family load',
  'Money feel (not advice)',
  'Habits / routines',
  'Self / identity',
] as const;

const LIFE_SUPPORT_OPTIONS = [
  'Kind words',
  'Someone showing up / time',
  'Help with tasks',
  'Practical ideas',
  'Space alone first',
] as const;

type SeasonLabel = (typeof SEASON_OPTIONS)[number];
type HardWindow = (typeof HARD_WINDOW_OPTIONS)[number];
type HealTheme = (typeof HEAL_THEME_OPTIONS)[number];
type HealMode = (typeof HEAL_MODE_OPTIONS)[number];
type HealEnergy = (typeof HEAL_ENERGY_OPTIONS)[number];
type MedLength = (typeof MED_LENGTH_OPTIONS)[number];
type MedExperience = (typeof MED_EXPERIENCE_OPTIONS)[number];
type BodyModality = (typeof BODY_MODALITY_OPTIONS)[number];
type BodyCapacity = (typeof BODY_CAPACITY_OPTIONS)[number];
type LifeDomain = (typeof LIFE_DOMAIN_OPTIONS)[number];
type LifeSupportPref = (typeof LIFE_SUPPORT_OPTIONS)[number];

interface OnboardingFlowProps {
  getToken?: () => Promise<string | null>;
  onComplete: () => void;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Day-1 must banks for selected pillars (spec §7 soft-launch packs). */
function surveyQuestionSteps(pillars: PillarId[]): SurveyStepId[] {
  const steps: SurveyStepId[] = ['g1', 'g2'];
  for (const p of pillars) {
    if (p === 'self-healing') steps.push('s1', 's2', 's3');
    else if (p === 'meditation') steps.push('m1', 'm2');
    else if (p === 'body') steps.push('b1', 'b2');
    else if (p === 'life-guidance') steps.push('l1', 'l2', 'l3');
  }
  return steps;
}

function microStepIndex(step: MicroStep): number {
  return step === 'disclosure' ? 0 : step === 'name' ? 1 : step === 'pillars' ? 2 : 3;
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
  const [medLength, setMedLength] = useState<MedLength | null>(null);
  const [medExperience, setMedExperience] = useState<MedExperience | null>(null);
  const [bodyModality, setBodyModality] = useState<BodyModality | null>(null);
  const [bodyCapacity, setBodyCapacity] = useState<BodyCapacity | null>(null);
  const [lifeDomains, setLifeDomains] = useState<LifeDomain[]>([]);
  const [lifeLighter10, setLifeLighter10] = useState('');
  const [lifeSupportPrefs, setLifeSupportPrefs] = useState<LifeSupportPref[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const questionSteps = useMemo(() => surveyQuestionSteps(pillars), [pillars]);
  const wantsSurvey = questionSteps.length > 2; // g1+g2 always if any pillar bank

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

  const toggleLifeDomain = useCallback((domain: LifeDomain) => {
    setLifeDomains((prev) => {
      if (prev.includes(domain)) return prev.filter((d) => d !== domain);
      if (prev.length >= 2) return [...prev.slice(1), domain];
      return [...prev, domain];
    });
  }, []);

  const toggleLifeSupport = useCallback((pref: LifeSupportPref) => {
    setLifeSupportPrefs((prev) => {
      if (prev.includes(pref)) return prev.filter((p) => p !== pref);
      if (prev.length >= 2) return [...prev.slice(1), pref];
      return [...prev, pref];
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
          if (medLength) survey.med_length = medLength;
          if (medExperience) survey.med_experience = medExperience;
          if (bodyModality) survey.body_modality = bodyModality;
          if (bodyCapacity) survey.body_capacity = bodyCapacity;
          if (lifeDomains.length) survey.life_domains = lifeDomains;
          const lighter = lifeLighter10.trim().slice(0, 120);
          if (lighter) survey.life_lighter_10 = lighter;
          if (lifeSupportPrefs.length) survey.life_support_pref = lifeSupportPrefs;
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
      bodyCapacity,
      bodyModality,
      getToken,
      healEnergy,
      healMode,
      healThemes,
      hardWindow,
      lifeDomains,
      lifeLighter10,
      lifeSupportPrefs,
      medExperience,
      medLength,
      onComplete,
      pillars,
      preferredName,
      rhythm,
      seasonLabel,
    ]
  );

  const afterRhythm = useCallback(() => {
    if (wantsSurvey) {
      setStep('survey_intro');
      return;
    }
    void finish(false);
  }, [finish, wantsSurvey]);

  /** Skip completes onboarding; keeps any survey answers already chosen. */
  const skipSurvey = useCallback(() => {
    void finish(true);
  }, [finish]);

  const goSurvey = useCallback(
    (from: SurveyStepId, dir: 1 | -1) => {
      if (from === 'survey_intro') {
        if (dir > 0) setStep(questionSteps[0] ?? 'g1');
        else setStep('rhythm');
        return;
      }
      const i = questionSteps.indexOf(from);
      if (i < 0) return;
      const next = i + dir;
      if (next < 0) {
        setStep('survey_intro');
        return;
      }
      if (next >= questionSteps.length) {
        void finish(true);
        return;
      }
      setStep(questionSteps[next]!);
    },
    [finish, questionSteps]
  );

  const isSurvey =
    step === 'survey_intro' || (questionSteps as string[]).includes(step);

  const surveyProgressLabel = (): string => {
    if (step === 'survey_intro') return 'Optional prefs';
    const i = questionSteps.indexOf(step as SurveyStepId);
    if (i < 0) return 'Optional prefs';
    return `Optional · ${i + 1} of ${questionSteps.length}`;
  };

  const kicker = isSurvey
    ? surveyProgressLabel()
    : `Getting started · ${microStepIndex(step) + 1} of 4`;

  const canAdvanceSurvey = (id: SurveyStepId): boolean => {
    switch (id) {
      case 'g1':
        return Boolean(seasonLabel);
      case 'g2':
        return Boolean(hardWindow);
      case 's1':
        return healThemes.length >= 1;
      case 's2':
        return Boolean(healMode);
      case 's3':
        return Boolean(healEnergy);
      case 'm1':
        return Boolean(medLength);
      case 'm2':
        return Boolean(medExperience);
      case 'b1':
        return Boolean(bodyModality);
      case 'b2':
        return Boolean(bodyCapacity);
      case 'l1':
        return lifeDomains.length >= 1;
      case 'l2':
        return lifeLighter10.trim().length >= 1;
      case 'l3':
        return lifeSupportPrefs.length >= 1;
      default:
        return false;
    }
  };

  const isLastQuestion =
    step !== 'survey_intro' &&
    questionSteps.indexOf(step as SurveyStepId) === questionSteps.length - 1;

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
            {error && !wantsSurvey ? (
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
                  : wantsSurvey
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
                onClick={() => goSurvey('survey_intro', 1)}
              >
                {questionSteps.length} quick questions
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
          <PickOne
            title="What season are you in right now?"
            lead="Pick one — frames how we talk about growth."
            options={SEASON_OPTIONS}
            value={seasonLabel}
            onPick={setSeasonLabel}
            ariaLabel="Season"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('g1')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('g1', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('g1', 1)}
          />
        ) : null}

        {step === 'g2' ? (
          <PickOne
            title="When is life usually hardest to show up for yourself?"
            lead="Helps place check-ins when they fit."
            options={HARD_WINDOW_OPTIONS}
            value={hardWindow}
            onPick={setHardWindow}
            ariaLabel="Hard window"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('g2')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('g2', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('g2', 1)}
          />
        ) : null}

        {step === 's1' ? (
          <PickMulti
            title="What's weighing on you most lately?"
            lead="Theme, not diagnosis — pick up to two."
            options={HEAL_THEME_OPTIONS}
            selected={healThemes}
            onToggle={toggleHealTheme}
            ariaLabel="Themes"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('s1')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('s1', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('s1', 1)}
          />
        ) : null}

        {step === 's2' ? (
          <PickOne
            title="How do you prefer to process?"
            lead="Write, talk, mix, or small actions first."
            options={HEAL_MODE_OPTIONS}
            value={healMode}
            onPick={setHealMode}
            ariaLabel="Process mode"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('s2')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('s2', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('s2', 1)}
          />
        ) : null}

        {step === 's3' ? (
          <PickOne
            title="Energy for reflection most days?"
            lead="Keeps practice short enough to keep."
            options={HEAL_ENERGY_OPTIONS}
            value={healEnergy}
            onPick={setHealEnergy}
            ariaLabel="Reflection energy"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('s3')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('s3', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('s3', 1)}
          />
        ) : null}

        {step === 'm1' ? (
          <PickOne
            title="How long can you realistically practice most days?"
            lead="Dose realism — short and keepable beats heroic."
            options={MED_LENGTH_OPTIONS}
            value={medLength}
            onPick={setMedLength}
            ariaLabel="Practice length"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('m1')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('m1', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('m1', 1)}
          />
        ) : null}

        {step === 'm2' ? (
          <PickOne
            title="What's true for you with quiet practice?"
            lead="Experience shapes how gentle we start."
            options={MED_EXPERIENCE_OPTIONS}
            value={medExperience}
            onPick={setMedExperience}
            ariaLabel="Meditation experience"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('m2')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('m2', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('m2', 1)}
          />
        ) : null}

        {step === 'b1' ? (
          <PickOne
            title="What kind of movement feels least like punishment?"
            lead="Preference first — capacity next."
            options={BODY_MODALITY_OPTIONS}
            value={bodyModality}
            onPick={setBodyModality}
            ariaLabel="Movement modality"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('b1')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('b1', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('b1', 1)}
          />
        ) : null}

        {step === 'b2' ? (
          <PickOne
            title="Right now your body capacity feels…"
            lead="We pace from here — no grind."
            options={BODY_CAPACITY_OPTIONS}
            value={bodyCapacity}
            onPick={setBodyCapacity}
            ariaLabel="Body capacity"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('b2')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('b2', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('b2', 1)}
          />
        ) : null}

        {step === 'l1' ? (
          <PickMulti
            title="Which life domains need the most support this Wave?"
            lead="Pick up to two — keeps the day concrete."
            options={LIFE_DOMAIN_OPTIONS}
            selected={lifeDomains}
            onToggle={toggleLifeDomain}
            ariaLabel="Life domains"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('l1')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('l1', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('l1', 1)}
          />
        ) : null}

        {step === 'l2' ? (
          <>
            <h2 id="onboard-title">
              What&apos;s one small change that would make days 10% lighter?
            </h2>
            <p className="onboard-lead">Short is fine — we&apos;ll turn it into a tiny next step.</p>
            <label className="sr-only" htmlFor="onboard-lighter">
              One small change
            </label>
            <textarea
              id="onboard-lighter"
              className="onboard-input onboard-textarea"
              value={lifeLighter10}
              onChange={(e) => setLifeLighter10(e.target.value.slice(0, 120))}
              placeholder="e.g. leave work at a set time · prep breakfast · one boundary text"
              maxLength={120}
              rows={3}
            />
            <SurveyNav
              submitting={submitting}
              error={error}
              canContinue={canAdvanceSurvey('l2')}
              isLast={isLastQuestion}
              onBack={() => goSurvey('l2', -1)}
              onSkip={skipSurvey}
              onContinue={() => goSurvey('l2', 1)}
            />
          </>
        ) : null}

        {step === 'l3' ? (
          <PickMulti
            title="When you need support, what lands best?"
            lead="Pick up to two — preferences, not a love-language quiz."
            options={LIFE_SUPPORT_OPTIONS}
            selected={lifeSupportPrefs}
            onToggle={toggleLifeSupport}
            ariaLabel="Support preferences"
            submitting={submitting}
            error={error}
            canContinue={canAdvanceSurvey('l3')}
            isLast={isLastQuestion}
            onBack={() => goSurvey('l3', -1)}
            onSkip={skipSurvey}
            onContinue={() => goSurvey('l3', 1)}
          />
        ) : null}
      </div>
    </div>
  );
}

function PickOne<T extends string>({
  title,
  lead,
  options,
  value,
  onPick,
  ariaLabel,
  submitting,
  error,
  canContinue,
  isLast,
  onBack,
  onSkip,
  onContinue,
}: {
  title: string;
  lead: string;
  options: readonly T[];
  value: T | null;
  onPick: (v: T) => void;
  ariaLabel: string;
  submitting: boolean;
  error: string;
  canContinue: boolean;
  isLast: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <h2 id="onboard-title">{title}</h2>
      <p className="onboard-lead">{lead}</p>
      <div className="onboard-chips" role="radiogroup" aria-label={ariaLabel}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`onboard-chip${active ? ' is-active' : ''}`}
              role="radio"
              aria-checked={active}
              onClick={() => onPick(opt)}
            >
              <span className="onboard-chip-label">{opt}</span>
            </button>
          );
        })}
      </div>
      <SurveyNav
        submitting={submitting}
        error={error}
        canContinue={canContinue}
        isLast={isLast}
        onBack={onBack}
        onSkip={onSkip}
        onContinue={onContinue}
      />
    </>
  );
}

function PickMulti<T extends string>({
  title,
  lead,
  options,
  selected,
  onToggle,
  ariaLabel,
  submitting,
  error,
  canContinue,
  isLast,
  onBack,
  onSkip,
  onContinue,
}: {
  title: string;
  lead: string;
  options: readonly T[];
  selected: T[];
  onToggle: (v: T) => void;
  ariaLabel: string;
  submitting: boolean;
  error: string;
  canContinue: boolean;
  isLast: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <h2 id="onboard-title">{title}</h2>
      <p className="onboard-lead">{lead}</p>
      <div className="onboard-chips" role="group" aria-label={ariaLabel}>
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`onboard-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onToggle(opt)}
            >
              <span className="onboard-chip-label">{opt}</span>
            </button>
          );
        })}
      </div>
      <SurveyNav
        submitting={submitting}
        error={error}
        canContinue={canContinue}
        isLast={isLast}
        onBack={onBack}
        onSkip={onSkip}
        onContinue={onContinue}
      />
    </>
  );
}

function SurveyNav({
  submitting,
  error,
  canContinue,
  isLast,
  onBack,
  onSkip,
  onContinue,
}: {
  submitting: boolean;
  error: string;
  canContinue: boolean;
  isLast?: boolean;
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
          {submitting ? 'Saving…' : isLast ? 'Start talking' : 'Continue'}
        </button>
      </div>
      <p className="onboard-skip-hint">Skip for now — we can learn as we talk.</p>
    </>
  );
}
