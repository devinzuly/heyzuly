import { ClerkRoot } from './ClerkRoot';
import { SignInPage } from './SignInPage';

interface Props {
  publishableKey: string;
}

export function AuthSignInGate({ publishableKey }: Props) {
  return (
    <ClerkRoot publishableKey={publishableKey}>
      <SignInPage />
    </ClerkRoot>
  );
}
