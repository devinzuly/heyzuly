#!/usr/bin/env node
/**
 * Detect the local Chrome profile used for Hey Zuly work.
 * Run: npm run chrome:detect
 *
 * Flags:
 *   --write   Write heyzuly.chrome.json when a matching profile is found
 */

import {
  CONFIG_FILE,
  detectProfiles,
  findHeyzulyProfile,
  getChromeExecutable,
  getChromeUserDataDir,
  writeConfigFromDetection,
} from './lib/heyzuly-chrome.mjs';

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');

const userDataDir = getChromeUserDataDir();

console.log('[chrome:detect] Chrome user data:', userDataDir || '(not found)');

if (!userDataDir) {
  console.error('[chrome:detect] Could not resolve Chrome user data directory.');
  process.exit(1);
}

const profiles = detectProfiles(userDataDir);
const match = findHeyzulyProfile(userDataDir);
const chromePath = getChromeExecutable();

console.log('[chrome:detect] Profiles:');
for (const profile of profiles) {
  const marker = profile.score > 0 ? ' *' : '';
  console.log(
    `  - ${profile.directory}: "${profile.name}"${profile.gaiaName ? ` (${profile.gaiaName})` : ''}${marker}`
  );
}

if (!match) {
  console.log('');
  console.log('[chrome:detect] No heyzuly profile found.');
  console.log('Create one in Chrome: top-right avatar → Add → name it "heyzuly".');
  console.log('Then re-run: npm run chrome:detect -- --write');
  process.exit(1);
}

console.log('');
console.log(
  `[chrome:detect] Selected: ${match.directory} ("${match.name}")`
);
if (chromePath) {
  console.log(`[chrome:detect] Chrome executable: ${chromePath}`);
}

if (shouldWrite) {
  const result = writeConfigFromDetection(userDataDir);
  if (result.written) {
    console.log(`[chrome:detect] Wrote ${CONFIG_FILE}`);
  }
} else {
  console.log('');
  console.log(
    `To save locally (gitignored), run: npm run chrome:detect -- --write`
  );
}
