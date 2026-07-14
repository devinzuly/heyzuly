import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useState } from 'react';

interface OnboardingDisclosureProps {
  onAccepted: () => void;
}

export function OnboardingDisclosure({ onAccepted }: OnboardingDisclosureProps) {
  const { getToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const accept = useCallback(async () => {
    setSubmitting(true);
    setError('');

    try {
      const token = await getToken();
      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError('Could not save your acknowledgment. Try again.');
        return;
      }

      onAccepted();
    } catch {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  }, [getToken, onAccepted]);

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-card">
        <p className="onboard-kicker">Before you begin</p>
        <h2 id="onboard-title">Zuly is an AI wellness guide</h2>
        <ul className="onboard-list">
          <li>She supports your growth — she is <strong>not a therapist</strong> or clinician.</li>
          <li>Conversations are AI-generated and are not confidential like therapy.</li>
          <li>
            If you&apos;re in crisis, call or text{' '}
            <a href="tel:988" className="crisis-link">
              988
            </a>{' '}
            (US) or visit{' '}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
              findahelpline.com
            </a>
            .
          </li>
        </ul>
        {error ? <p className="onboard-error">{error}</p> : null}
        <button
          type="button"
          className="btn btn-gold onboard-btn"
          onClick={accept}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'I understand — continue'}
        </button>
      </div>
    </div>
  );
}

interface UserMenuProps {
  email: string;
}

function UserMenu({ email }: UserMenuProps) {
  const { signOut } = useClerk();
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
      {open ? (
        <div className="user-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => signOut({ redirectUrl: '/' })}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChatStub() {
  return (
    <div className="chat-stub">
      <div className="chat-stub-head">
        <div className="chat-stub-av" aria-hidden="true">
          Z
        </div>
        <div>
          <h2>Talk to Zuly</h2>
          <p>Preview shell — real chat ships in Phase 4.</p>
        </div>
      </div>
      <div className="chat-stub-thread">
        <div className="bub z">
          <span className="who">Zuly</span>
          Good to see you. When chat goes live, this is where we&apos;ll pick up — one small step at a
          time.
        </div>
        <div className="bub u">I&apos;m ready when you are.</div>
        <div className="bub z">
          <span className="who">Zuly</span>
          For now, explore the shell. Your account, onboarding, and safety links are wired.
        </div>
      </div>
      <div className="chat-stub-input" aria-hidden="true">
        <span className="chat-stub-placeholder">Chat input coming in Phase 4…</span>
        <span className="chat-stub-send">↑</span>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: 'today', label: 'Today', active: false },
  { id: 'talk', label: 'Talk', active: true },
  { id: 'plan', label: 'Plan', active: false },
  { id: 'grow', label: 'Grow', active: false },
  { id: 'you', label: 'You', active: false },
];

export function AppShell() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [gateReady, setGateReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [inviteBlocked, setInviteBlocked] = useState(false);

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
    <div className="app-shell">
      {needsOnboarding ? (
        <OnboardingDisclosure onAccepted={() => setNeedsOnboarding(false)} />
      ) : null}

      <header className="app-top">
        <a href="/app" className="app-brand">
          <span className="auth-brand-hey">Hey</span>
          <span className="auth-brand-zuly">Zuly</span>
        </a>
        <div className="app-top-right">
          <a href="tel:988" className="crisis-pill">
            Crisis: 988
          </a>
          <UserMenu email={email} />
        </div>
      </header>

      <div className="app-body">
        <nav className="app-sidebar" aria-label="App sections">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app-nav-item${item.active ? ' is-active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
              disabled={!item.active}
            >
              <span className="app-nav-dot" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <main className="app-main">
          <ChatStub />
        </main>
      </div>

      <footer className="app-foot">
        <span>Zuly is an AI wellness guide, not a therapist.</span>
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
          Crisis resources
        </a>
      </footer>
    </div>
  );
}
