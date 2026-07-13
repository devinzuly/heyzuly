import { spawn } from 'node:child_process';
import { resolveChromeLaunchConfig } from './lib/heyzuly-chrome.mjs';

export function openHeyzulyChrome(url) {
  const launch = resolveChromeLaunchConfig({ url });

  if (!launch.chromePath || !launch.profileDirectory) {
    console.warn(
      '[chrome] Skipping browser open — profile or Chrome executable not configured.'
    );
    console.warn('Run: npm run chrome:detect -- --write');
    return false;
  }

  const args = [
    `--profile-directory=${launch.profileDirectory}`,
    launch.defaultUrl,
  ];

  const child = spawn(launch.chromePath, args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });

  child.unref();
  return true;
}
