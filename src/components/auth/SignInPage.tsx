import { SignIn } from '@clerk/clerk-react';
import { clerkAppearance } from './ClerkRoot';

export function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <a href="/" className="auth-brand">
            <span className="auth-brand-hey">Hey</span>
            <span className="auth-brand-zuly">Zuly</span>
          </a>
          <p className="auth-lead">Welcome back. Zuly is ready when you are.</p>
        </header>
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          appearance={clerkAppearance}
        />
        <p className="auth-foot">
          New here? <a href="/sign-up">Create an account</a>
        </p>
      </div>
    </div>
  );
}
