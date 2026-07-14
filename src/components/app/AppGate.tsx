import { ClerkRoot } from '../auth/ClerkRoot';
import { AppShell } from './AppShell';

interface Props {
  publishableKey: string;
}

export function AppGate({ publishableKey }: Props) {
  return (
    <ClerkRoot publishableKey={publishableKey}>
      <AppShell />
    </ClerkRoot>
  );
}
