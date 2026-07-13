#!/usr/bin/env node
/**
 * Start a dev server and open Chrome with the Hey Zuly profile.
 * Run: npm run dev:open | npm run pages:dev:open
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHeyzulyChrome } from './open-heyzuly-chrome-runner.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MODES = {
  astro: {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['astro', 'dev'],
    url: 'http://localhost:4321',
    label: 'Astro dev',
  },
  pages: {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'pages:dev'],
    url: 'http://localhost:8788',
    label: 'Pages dev',
  },
};

function parseMode() {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  const mode = modeArg?.split('=')[1] || process.argv[2] || 'astro';
  if (!MODES[mode]) {
    console.error(`[dev:open] Unknown mode "${mode}". Use astro or pages.`);
    process.exit(1);
  }
  return MODES[mode];
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

const mode = parseMode();

console.log(`[dev:open] Starting ${mode.label}...`);

const child = spawn(mode.command, mode.args, {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

let opened = false;

const openWhenReady = async () => {
  if (opened) {
    return;
  }

  const ready = await waitForUrl(mode.url);
  if (!ready) {
    console.warn(`[dev:open] Timed out waiting for ${mode.url}`);
    return;
  }

  opened = true;
  console.log(`[dev:open] Server ready — opening Chrome (${mode.url})`);
  openHeyzulyChrome(mode.url);
};

void openWhenReady();

const shutdown = () => {
  if (!child.killed) {
    child.kill('SIGTERM');
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
