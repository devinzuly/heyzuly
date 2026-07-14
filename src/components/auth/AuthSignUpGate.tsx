import { ClerkRoot } from './ClerkRoot';
import { SignUpPage } from './SignUpPage';

interface Props {
  publishableKey: string;
}

export function AuthSignUpGate({ publishableKey }: Props) {
  return (
    <ClerkRoot publishableKey={publishableKey}>
      <SignUpPage />
    </ClerkRoot>
  );
}
