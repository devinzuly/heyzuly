import { ClerkRoot } from '../auth/ClerkRoot';
import { AppShell, DevAppShell } from './AppShell';

interface Props {
  publishableKey: string;
  /** Build-time: PUBLIC_CHAT_DEV_BYPASS — show /app chat without Clerk */
  chatDevBypass?: boolean;
}

export function AppGate({ publishableKey, chatDevBypass = false }: Props) {
  if (!publishableKey && chatDevBypass) {
    return <DevAppShell />;
  }

  return (
    <ClerkRoot publishableKey={publishableKey}>
      <AppShell />
    </ClerkRoot>
  );
}
