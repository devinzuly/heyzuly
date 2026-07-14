import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChatPanel } from './ChatPanel';
import { GrowPanel } from './GrowPanel';
import { HelpSheet } from './HelpSheet';
import { OnboardingFlow } from './OnboardingFlow';
import { PlanPanel } from './PlanPanel';
import { WaveTodayPanel } from './WaveTodayPanel';
import { YouPanel } from './YouPanel';

type AppTab = 'today' | 'talk' | 'plan' | 'grow' | 'you';

interface UserMenuProps {
  email: string;
  onSignOut?: () => void;
}

function UserMenu({ email, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="user-menu">
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="user-avatar" aria-hidden="true">
          {email.charAt(0).toUpperCase()}
        </span>
        <span className="user-email">{email}</span>
      </button>
      {open && onSignOut ? (
        <div className="user-menu-panel" role="menu">
          <button type="button" role="menuitem" className="user-menu-item" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Small geometric marks — same gold/dot language as the sidebar. */
function NavIcon({ id }: { id: AppTab }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    'aria-hidden': true as const,
    className: 'app-nav-icon',
  };
  switch (id) {
    case 'today':
      return (
        <svg {...common}>
          <rect x="2" y="2.5" width="10" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 5.5h10" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 1.5v2M9 1.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'talk':
      return (
        <svg {...common}>
          <path
            d="M2.5 3.2h9a1.2 1.2 0 0 1 1.2 1.2v4.2a1.2 1.2 0 0 1-1.2 1.2H6.2L3.5 12V9.6H2.5A1.2 1.2 0 0 1 1.3 8.4V4.4A1.2 1.2 0 0 1 2.5 3.2Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'plan':
      return (
        <svg {...common}>
          <path
            d="M3 2.5h8v9H3z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M5 5h4M5 7.5h4M5 10h2.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case 'grow':
      return (
        <svg {...common}>
          <path
            d="M7 12V7.5M7 7.5C5.2 7.5 3.5 5.8 3.5 3.5 5.8 3.5 7 5.2 7 7.5ZM7 7.5c1.8 0 3.5-1.7 3.5-4C8.2 3.5 7 5.2 7 7.5Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'you':
      return (
        <svg {...common}>
          <circle cx="7" cy="4.2" r="2.1" stroke="currentColor" strokeWidth="1.35" />
          <path
            d="M2.8 12c.4-2.4 2-3.6 4.2-3.6s3.8 1.2 4.2 3.6"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

const NAV_ITEMS: Array<{ id: AppTab; label: string; enabled: boolean }> = [
  { id: 'today', label: 'Today', enabled: true },
  { id: 'talk', label: 'Talk', enabled: true },
  { id: 'plan', label: 'Plan', enabled: true },
  { id: 'grow', label: 'Grow', enabled: true },
  { id: 'you', label: 'You', enabled: true },
];

/** Landing core loop — compact strip; growth language, not a second nav. */
const LOOP_STEPS = ['Talk', 'Learn', 'Build', 'Calendar', 'Check in'] as const;

function AppLoopStrip() {
  return (
    <p className="app-loop-strip" aria-label="How Zuly works">
      {LOOP_STEPS.map((step, i) => (
        <span key={step} className="app-loop-step">
          {i > 0 ? (
            <span className="app-loop-arrow" aria-hidden="true">
              →
            </span>
          ) : null}
          <span className="app-loop-label">{step}</span>
        </span>
      ))}
    </p>
  );
}

interface ShellChromeProps {
  email: string;
  onSignOut?: () => void;
  children: ReactNode;
  banner?: string;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  helpOpen: boolean;
  onHelpOpen: () => void;
  onHelpClose: () => void;
}

function ShellChrome({
  email,
  onSignOut,
  children,
  banner,
  activeTab,
  onTabChange,
  helpOpen,
  onHelpOpen,
  onHelpClose,
}: ShellChromeProps) {
  return (
    <div className="app-shell">
      {banner ? <p className="app-dev-banner">{banner}</p> : null}

      <header className="app-top">
        <div className="app-top-brand-block">
          <a href="/app" className="app-brand">
            <span className="auth-brand-hey">Hey</span>
            <span className="auth-brand-zuly">Zuly</span>
          </a>
          <AppLoopStrip />
        </div>
        <div className="app-top-right">
          <button type="button" className="help-pill" onClick={onHelpOpen}>
            Help
          </button>
          <a href="tel:988" className="crisis-pill">
            Crisis: 988
          </a>
          <UserMenu email={email} onSignOut={onSignOut} />
        </div>
      </header>

      <HelpSheet open={helpOpen} onClose={onHelpClose} />

      <nav className="app-mobile-nav" aria-label="App sections">
        {NAV_ITEMS.map((item) => {
          const isActive = item.enabled && item.id === activeTab;
          return (
            <button
              key={`m-${item.id}`}
              type="button"
              className={`app-mobile-nav-item${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              disabled={!item.enabled}
              onClick={() => {
                if (item.enabled) onTabChange(item.id);
              }}
            >
              <NavIcon id={item.id} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="app-body">
        <nav className="app-sidebar" aria-label="App sections">
          {NAV_ITEMS.map((item) => {
            const isActive = item.enabled && item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                className={`app-nav-item${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                disabled={!item.enabled}
                onClick={() => {
                  if (item.enabled) onTabChange(item.id);
                }}
              >
                <NavIcon id={item.id} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <main className="app-main">{children}</main>
      </div>

      <footer className="app-foot">
        <span>Zuly is an AI wellness guide, not a therapist.</span>
        <nav className="app-foot-links" aria-label="Legal and crisis">
          <a href="/privacy">Privacy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms">Terms</a>
          <span aria-hidden="true">·</span>
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
            Crisis resources
          </a>
        </nav>
      </footer>
    </div>
  );
}

function hasOnboardingCompleteFact(
  prefs: { facts?: Array<{ key: string; value: string }> } | null | undefined
): boolean {
  return Boolean(
    prefs?.facts?.some(
      (f) => f.key === 'onboarding.complete' && (f.value === '1' || f.value === 'true')
    )
  );
}

interface ShellBodyProps {
  getToken?: () => Promise<string | null>;
  chatKey: number;
  waveRefreshKey: number;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onWaveRefresh: () => void;
  onPracticeWithZuly: (prompt: string) => void;
  practiceDraft: string | null;
  practiceDraftKey: number;
  chatSubtitle?: string;
  localStressTest?: boolean;
  onOpenHelp: () => void;
}

function ShellBody({
  getToken,
  chatKey,
  waveRefreshKey,
  activeTab,
  onTabChange,
  onWaveRefresh,
  onPracticeWithZuly,
  practiceDraft,
  practiceDraftKey,
  chatSubtitle,
  localStressTest = false,
  onOpenHelp,
}: ShellBodyProps) {
  return (
    <>
      {activeTab === 'today' ? (
        <WaveTodayPanel
          getToken={getToken}
          refreshKey={waveRefreshKey}
          variant="full"
          onOpenTalk={() => onTabChange('talk')}
          onPracticeWithZuly={onPracticeWithZuly}
        />
      ) : null}
      {activeTab === 'talk' ? (
        <>
          <WaveTodayPanel
            getToken={getToken}
            refreshKey={waveRefreshKey}
            variant="compact"
            onOpenToday={() => onTabChange('today')}
            onPracticeWithZuly={onPracticeWithZuly}
          />
          <ChatPanel
            key={chatKey}
            getToken={getToken}
            subtitle={chatSubtitle}
            onDayPlanConfirmed={onWaveRefresh}
            practiceDraft={practiceDraft}
            practiceDraftKey={practiceDraftKey}
            onOpenHelp={onOpenHelp}
          />
        </>
      ) : null}
      {activeTab === 'plan' ? (
        <PlanPanel
          getToken={getToken}
          refreshKey={waveRefreshKey}
          onOpenTalk={() => onTabChange('talk')}
          onOpenGrow={() => onTabChange('grow')}
        />
      ) : null}
      {activeTab === 'grow' ? (
        <GrowPanel getToken={getToken} refreshKey={chatKey} />
      ) : null}
      {activeTab === 'you' ? (
        <YouPanel
          getToken={getToken}
          refreshKey={chatKey}
          localStressTest={localStressTest}
          onOpenHelp={onOpenHelp}
        />
      ) : null}
    </>
  );
}

/** Local shell without Clerk — requires CHAT_DEV_BYPASS on the API. */
export function DevAppShell() {
  const [gateReady, setGateReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [chatKey, setChatKey] = useState(0);
  const [waveRefreshKey, setWaveRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AppTab>('talk');
  const [practiceDraft, setPracticeDraft] = useState<string | null>(null);
  const [practiceDraftKey, setPracticeDraftKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/memory', { method: 'GET' });
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.ok && hasOnboardingCompleteFact(data.prefs)) {
          setNeedsOnboarding(false);
        }
      } catch {
        // Show onboarding if we cannot confirm completion.
      } finally {
        if (!cancelled) setGateReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onOnboardingComplete = useCallback(() => {
    setNeedsOnboarding(false);
    setChatKey((k) => k + 1);
    setWaveRefreshKey((k) => k + 1);
    setActiveTab('talk');
  }, []);

  const onWaveRefresh = useCallback(() => {
    setWaveRefreshKey((k) => k + 1);
  }, []);

  const onPracticeWithZuly = useCallback((prompt: string) => {
    const next = prompt.trim();
    if (!next) return;
    setPracticeDraft(next);
    setPracticeDraftKey((k) => k + 1);
    setActiveTab('talk');
  }, []);

  if (!gateReady) {
    return <div className="app-loading">Setting up your space…</div>;
  }

  return (
    <ShellChrome
      email="dev@localhost"
      banner="Dev bypass — no Clerk. API must have CHAT_DEV_BYPASS=true in .dev.vars."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      helpOpen={helpOpen}
      onHelpOpen={() => setHelpOpen(true)}
      onHelpClose={() => setHelpOpen(false)}
    >
      {needsOnboarding ? (
        <OnboardingFlow onComplete={onOnboardingComplete} />
      ) : (
        <ShellBody
          chatKey={chatKey}
          waveRefreshKey={waveRefreshKey}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onWaveRefresh={onWaveRefresh}
          onPracticeWithZuly={onPracticeWithZuly}
          practiceDraft={practiceDraft}
          practiceDraftKey={practiceDraftKey}
          chatSubtitle="Local chat stub (no Clerk). Crisis keywords route to 988; Anthropic optional."
          localStressTest
          onOpenHelp={() => setHelpOpen(true)}
        />
      )}
    </ShellChrome>
  );
}

export function AppShell() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [gateReady, setGateReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [inviteBlocked, setInviteBlocked] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [waveRefreshKey, setWaveRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AppTab>('talk');
  const [practiceDraft, setPracticeDraft] = useState<string | null>(null);
  const [practiceDraftKey, setPracticeDraftKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/users/sync', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();

        if (cancelled) return;

        if (res.status === 403 && data.error === 'not_invited') {
          setInviteBlocked(true);
          setGateReady(true);
          return;
        }

        if (!res.ok || !data.ok) {
          setGateReady(true);
          return;
        }

        setNeedsOnboarding(!data.user?.onboarding_complete);
        setGateReady(true);
      } catch {
        if (!cancelled) setGateReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  const onOnboardingComplete = useCallback(() => {
    setNeedsOnboarding(false);
    setChatKey((k) => k + 1);
    setWaveRefreshKey((k) => k + 1);
    setActiveTab('talk');
  }, []);

  const onWaveRefresh = useCallback(() => {
    setWaveRefreshKey((k) => k + 1);
  }, []);

  const onPracticeWithZuly = useCallback((prompt: string) => {
    const next = prompt.trim();
    if (!next) return;
    setPracticeDraft(next);
    setPracticeDraftKey((k) => k + 1);
    setActiveTab('talk');
  }, []);

  if (!isLoaded) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!isSignedIn) {
    window.location.replace('/sign-in');
    return <div className="app-loading">Redirecting to sign in…</div>;
  }

  if (!gateReady) {
    return <div className="app-loading">Setting up your space…</div>;
  }

  if (inviteBlocked) {
    return (
      <div className="app-gate app-gate--invite">
        <p className="app-gate-kicker">Early access</p>
        <h1>Invite only for now</h1>
        <p>
          Your account isn&apos;t on the invite list yet. Join the waitlist and we&apos;ll email you
          when a spot opens — soft and in order, no rush.
        </p>
        <div className="app-gate-actions">
          <a className="btn btn-gold" href="/#join">
            Join the waitlist
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            Sign out
          </button>
        </div>
        <p className="app-gate-support">
          Already invited? Sign in with that email, or write{' '}
          <a href="mailto:support@heyzuly.com">support@heyzuly.com</a>.
        </p>
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? 'you';

  return (
    <ShellChrome
      email={email}
      onSignOut={() => signOut({ redirectUrl: '/' })}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      helpOpen={helpOpen}
      onHelpOpen={() => setHelpOpen(true)}
      onHelpClose={() => setHelpOpen(false)}
    >
      {needsOnboarding ? (
        <OnboardingFlow getToken={getToken} onComplete={onOnboardingComplete} />
      ) : (
        <ShellBody
          getToken={getToken}
          chatKey={chatKey}
          waveRefreshKey={waveRefreshKey}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onWaveRefresh={onWaveRefresh}
          onPracticeWithZuly={onPracticeWithZuly}
          practiceDraft={practiceDraft}
          practiceDraftKey={practiceDraftKey}
          onOpenHelp={() => setHelpOpen(true)}
        />
      )}
    </ShellChrome>
  );
}
