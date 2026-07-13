#!/usr/bin/env node
/**
 * Open a URL in Chrome using the Hey Zuly profile.
 * Run: npm run chrome:heyzuly [-- url]
 */

import { spawn } from 'node:child_process';
import { resolveChromeLaunchConfig } from './lib/heyzuly-chrome.mjs';

const positionalUrl = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith('-'));

const launch = resolveChromeLaunchConfig({
  url: positionalUrl,
});

if (!launch.chromePath) {
  console.error(
    '[chrome] Google Chrome not found. Set chromePath in heyzuly.chrome.json or HEYZULY_CHROME_PATH.'
  );
  process.exit(1);
}

if (!launch.profileDirectory) {
  console.error('[chrome] No heyzuly Chrome profile configured.');
  console.error('Run: npm run chrome:detect -- --write');
  console.error('Or set HEYZULY_CHROME_PROFILE=Profile\\ X');
  process.exit(1);
}

const args = [
  `--profile-directory=${launch.profileDirectory}`,
  launch.defaultUrl,
];

console.log(
  `[chrome] Opening ${launch.defaultUrl} with profile ${launch.profileDirectory} ("${launch.profileName}")`
);

const child = spawn(launch.chromePath, args, {
  detached: true,
  stdio: 'ignore',
  shell: false,
});

child.unref();
