#!/usr/bin/env node
/**
 * Grant an early-access invite (POST /api/invite/grant).
 * Usage:
 *   npm run invite:grant -- user@example.com
 *   npm run invite:grant -- user@example.com --base http://localhost:8788
 *   npm run invite:grant -- user@example.com --prod
 *
 * Reads INVITE_ADMIN_SECRET from .dev.vars (never prints the secret).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_VARS = join(ROOT, '.dev.vars');
const DEFAULT_LOCAL = 'http://localhost:8788';
const PROD_BASE = 'https://heyzuly.com';

function usage(exitCode = 1) {
  console.error(`Usage: npm run invite:grant -- <email> [--base <url>] [--prod]

  --base <url>   API origin (default: ${DEFAULT_LOCAL})
  --prod         shorthand for --base ${PROD_BASE}

Reads INVITE_ADMIN_SECRET from .dev.vars (never printed).
Ensure auth/wave migrations are applied and pages:dev (or prod) is reachable.`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let email = null;
  let base = DEFAULT_LOCAL;
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') usage(0);
    if (a === '--prod') {
      base = PROD_BASE;
      i += 1;
      continue;
    }
    if (a === '--base') {
      const next = args[i + 1];
      if (!next || next.startsWith('-')) {
        console.error('[invite] --base requires a URL');
        usage(1);
      }
      base = next.replace(/\/$/, '');
      i += 2;
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`[invite] Unknown flag: ${a}`);
      usage(1);
    }
    if (email) {
      console.error('[invite] Only one email argument is allowed');
      usage(1);
    }
    email = a;
    i += 1;
  }
  return { email, base };
}

function readInviteSecret() {
  if (!existsSync(DEV_VARS)) {
    return null;
  }
  const text = readFileSync(DEV_VARS, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== 'INVITE_ADMIN_SECRET') continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || null;
  }
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

const { email: rawEmail, base } = parseArgs(process.argv);
if (!rawEmail) {
  console.error('[invite] Email is required');
  usage(1);
}

const email = rawEmail.trim().toLowerCase();
if (!isValidEmail(email)) {
  console.error('[invite] Invalid email address');
  process.exit(1);
}

const secret = readInviteSecret();
if (!secret) {
  console.error(
    '[invite] INVITE_ADMIN_SECRET not found in .dev.vars — add it (see .dev.vars.example). Secret is never printed.'
  );
  process.exit(1);
}

const url = `${base}/api/invite/grant`;
console.log(`[invite] Granting invite for ${email} → ${url}`);

let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[invite] Request failed: ${msg}`);
  console.error('[invite] Is pages:dev running (local), or is --prod / --base correct?');
  process.exit(1);
}

let data = {};
try {
  data = await res.json();
} catch {
  // non-JSON body
}

if (!res.ok || !data.ok) {
  const err = data.error ? String(data.error) : `HTTP ${res.status}`;
  const hint = data.hint ? ` (${data.hint})` : '';
  console.error(`[invite] Failed: ${err}${hint}`);
  if (err === 'not_configured') {
    console.error(
      '[invite] Server has no INVITE_ADMIN_SECRET — set it in .dev.vars (local) or Pages secrets (prod).'
    );
  }
  if (err === 'unauthorized') {
    console.error(
      '[invite] Secret in .dev.vars does not match the server. Update INVITE_ADMIN_SECRET (do not print it).'
    );
  }
  process.exit(1);
}

const status = data.status === 'exists' ? 'already invited' : 'granted';
console.log(`[invite] ✓ ${email} — ${status}`);
if (data.message) {
  console.log(`[invite] ${data.message}`);
}
process.exit(0);
