import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChatPanel } from './ChatPanel';
import { GrowPanel } from './GrowPanel';
import { OnboardingFlow } from './OnboardingFlow';
import { WaveTodayPanel } from './WaveTodayPanel';

type AppTab = 'talk' | 'grow';

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

const NAV_ITEMS: Array<{ id: AppTab | 'today' | 'plan' | 'you'; label: string; enabled: boolean }> =
  [
    { id: 'today', label: 'Today', enabled: false },
    { id: 'talk', label: 'Talk', enabled: true },
    { id: 'plan', label: 'Plan', enabled: false },
    { id: 'grow', label: 'Grow', enabled: true },
    { id: 'you', label: 'You', enabled: false },
  ];

interface ShellChromeProps {
  email: string;
  onSignOut?: () => void;
  children: ReactNode;
  banner?: string;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

function ShellChrome({
  email,
  onSignOut,
  children,
  banner,
  activeTab,
  onTabChange,
}: ShellChromeProps) {
  return (
    <div className="app-shell">
      {banner ? <p className="app-dev-banner">{banner}</p> : null}

      <header className="app-top">
        <a href="/app" className="app-brand">
          <span className="auth-brand-hey">Hey</span>
          <span className="auth-brand-zuly">Zuly</span>
        </a>
        <div className="app-top-right">
          <a href="tel:988" className="crisis-pill">
            Crisis: 988
          </a>
          <UserMenu email={email} onSignOut={onSignOut} />
        </div>
      </header>

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
                  if (item.id === 'talk' || item.id === 'grow') {
                    onTabChange(item.id);
                  }
                }}
              >
                <span className="app-nav-dot" aria-hidden="true" />
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

/** Local shell without Clerk — requires CHAT_DEV_BYPASS on the API. */
export function DevAppShell() {
  const [gateReady, setGateReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [chatKey, setChatKey] = useState(0);
  const [waveRefreshKey, setWaveRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AppTab>('talk');

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

  if (!gateReady) {
    return <div className="app-loading">Setting up your space…</div>;
  }

  return (
    <ShellChrome
      email="dev@localhost"
      banner="Dev bypass — no Clerk. API must have CHAT_DEV_BYPASS=true in .dev.vars."
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {needsOnboarding ? (
        <OnboardingFlow onComplete={onOnboardingComplete} />
      ) : null}
      {!needsOnboarding && activeTab === 'talk' ? (
        <>
          <WaveTodayPanel refreshKey={waveRefreshKey} />
          <ChatPanel
            key={chatKey}
            subtitle="Local chat stub (no Clerk). Crisis keywords route to 988; Anthropic optional."
            onDayPlanConfirmed={() => setWaveRefreshKey((k) => k + 1)}
          />
        </>
      ) : null}
      {!needsOnboarding && activeTab === 'grow' ? (
        <GrowPanel refreshKey={chatKey} />
      ) : null}
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
      <div className="app-gate">
        <h1>Early access by invite</h1>
        <p>
          Your account isn&apos;t on the invite list yet. Join the waitlist and we&apos;ll email you
          when it&apos;s your turn.
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
    >
      {needsOnboarding ? (
        <OnboardingFlow getToken={getToken} onComplete={onOnboardingComplete} />
      ) : null}
      {!needsOnboarding && activeTab === 'talk' ? (
        <>
          <WaveTodayPanel getToken={getToken} refreshKey={waveRefreshKey} />
          <ChatPanel
            key={chatKey}
            getToken={getToken}
            onDayPlanConfirmed={() => setWaveRefreshKey((k) => k + 1)}
          />
        </>
      ) : null}
      {!needsOnboarding && activeTab === 'grow' ? (
        <GrowPanel getToken={getToken} refreshKey={chatKey} />
      ) : null}
    </ShellChrome>
  );
}
