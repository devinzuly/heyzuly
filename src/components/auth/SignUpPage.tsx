import { SignUp } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { clerkAppearance } from './ClerkRoot';

export function SignUpPage() {
  const [inviteRequired, setInviteRequired] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/invite/status');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.ok) {
          setInviteRequired(Boolean(data.invite_required));
        } else {
          setInviteRequired(false);
        }
      } catch {
        if (!cancelled) setInviteRequired(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <a href="/" className="auth-brand">
            <span className="auth-brand-hey">Hey</span>
            <span className="auth-brand-zuly">Zuly</span>
          </a>
          <p className="auth-lead">Create your account to preview Zuly early.</p>
          {inviteRequired ? (
            <p className="auth-invite-tip" role="status">
              Soft launch is invite-only. Use the email we invited, or{' '}
              <a href="/#join">join the waitlist</a> first.
            </p>
          ) : null}
        </header>
        <SignUp
          routing="hash"
          signInUrl="/sign-in"
          appearance={clerkAppearance}
        />
        <p className="auth-foot">
          Already have an account? <a href="/sign-in">Log in</a>
        </p>
      </div>
    </div>
  );
}
