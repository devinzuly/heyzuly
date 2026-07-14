import { SignUp } from '@clerk/clerk-react';
import { clerkAppearance } from './ClerkRoot';

export function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <a href="/" className="auth-brand">
            <span className="auth-brand-hey">Hey</span>
            <span className="auth-brand-zuly">Zuly</span>
          </a>
          <p className="auth-lead">Create your account to preview Zuly early.</p>
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
