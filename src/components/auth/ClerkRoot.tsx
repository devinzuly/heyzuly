import { ClerkProvider } from '@clerk/clerk-react';
import type { ReactNode } from 'react';

const clerkAppearance = {
  variables: {
    colorPrimary: '#A9772A',
    colorBackground: '#FFFCF1',
    colorText: '#1A1410',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#1A1410',
    borderRadius: '0.75rem',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  elements: {
    card: {
      boxShadow: '0 22px 50px -22px rgba(60,25,15,.35)',
      border: '1px solid #EEE0C6',
    },
    formButtonPrimary: {
      background: 'linear-gradient(135deg, #A9772A, #56140F)',
    },
  },
};

interface ClerkRootProps {
  publishableKey: string;
  children: ReactNode;
}

export function ClerkRoot({ publishableKey, children }: ClerkRootProps) {
  if (!publishableKey) {
    return (
      <div className="auth-missing">
        <h1>Auth not configured</h1>
        <p>
          Set <code>PUBLIC_CLERK_PUBLISHABLE_KEY</code> in <code>.env</code> (build) and{' '}
          <code>CLERK_SECRET_KEY</code> in <code>.dev.vars</code> (API). See{' '}
          <code>docs/CLOUDFLARE-SETUP.md</code>.
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/app"
      afterSignUpUrl="/app"
    >
      {children}
    </ClerkProvider>
  );
}

export { clerkAppearance };
