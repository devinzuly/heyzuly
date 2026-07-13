#!/usr/bin/env node
/**
 * Idempotent Hey Zuly waitlist / Cloudflare D1 setup.
 * Run: npm run setup:waitlist
 *
 * Flags:
 *   --push-secrets   Pipe generated secrets to wrangler pages secret put (requires auth)
 *   --skip-local     Skip local D1 migration
 *   --skip-remote    Skip remote D1 migration (even when authenticated)
 */

import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER_TOML = join(ROOT, 'wrangler.toml');
const DEV_VARS = join(ROOT, '.dev.vars');
const DEV_VARS_EXAMPLE = join(ROOT, '.dev.vars.example');
const MIGRATION_FILE = join(ROOT, 'migrations', '0001_create_waitlist.sql');

const DB_NAME = 'heyzuly-waitlist';
const DB_BINDING = 'DB';
const PAGES_PROJECT = 'heyzuly';
const PLACEHOLDER_ID = 'REPLACE_WITH_D1_DATABASE_ID';

const args = new Set(process.argv.slice(2));
const pushSecrets = args.has('--push-secrets');
const skipLocal = args.has('--skip-local');
const skipRemote = args.has('--skip-remote');

const log = {
  info: (msg) => console.log(`[setup] ${msg}`),
  ok: (msg) => console.log(`[setup] ✓ ${msg}`),
  warn: (msg) => console.warn(`[setup] ⚠ ${msg}`),
  err: (msg) => console.error(`[setup] ✗ ${msg}`),
};

function runWrangler(wranglerArgs, { input, allowFail = false } = {}) {
  const result = spawnSync('npx', ['wrangler', ...wranglerArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    input,
    shell: process.platform === 'win32',
    stdio: input ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
  });

  if (!allowFail && result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(
      `wrangler ${wranglerArgs.join(' ')} failed (exit ${result.status})${detail ? `: ${detail}` : ''}`
    );
  }

  return result;
}

function parseToml() {
  const text = readFileSync(WRANGLER_TOML, 'utf8');
  const nameMatch = text.match(/database_name\s*=\s*"([^"]+)"/);
  const idMatch = text.match(/database_id\s*=\s*"([^"]+)"/);
  return {
    text,
    databaseName: nameMatch?.[1] ?? DB_NAME,
    databaseId: idMatch?.[1] ?? PLACEHOLDER_ID,
  };
}

function updateWranglerDatabaseId(databaseId) {
  const { text, databaseId: current } = parseToml();
  if (current === databaseId) {
    return false;
  }

  const updated = text.replace(
    /database_id\s*=\s*"[^"]*"/,
    `database_id = "${databaseId}"`
  );
  writeFileSync(WRANGLER_TOML, updated, 'utf8');
  return true;
}

function checkAuth() {
  const result = runWrangler(['whoami'], { allowFail: true });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const authenticated =
    result.status === 0 && !/not authenticated/i.test(output);
  return { authenticated, output: output.trim() };
}

function listRemoteDatabases() {
  const result = runWrangler(['d1', 'list', '--json'], { allowFail: true });
  if (result.status !== 0) {
    return null;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function createRemoteDatabase() {
  const result = runWrangler(['d1', 'create', DB_NAME], { allowFail: true });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  const idMatch =
    output.match(/database_id\s*=\s*"([^"]+)"/i) ||
    output.match(/"uuid"\s*:\s*"([^"]+)"/i) ||
    output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);

  if (idMatch) {
    return idMatch[1];
  }

  throw new Error(`Could not parse database_id from d1 create output:\n${output}`);
}

function resolveRemoteDatabaseId() {
  const { databaseId } = parseToml();

  if (databaseId && databaseId !== PLACEHOLDER_ID) {
    log.ok(`wrangler.toml already has database_id (${databaseId})`);
    return databaseId;
  }

  const databases = listRemoteDatabases();
  if (!databases) {
    throw new Error('Could not list remote D1 databases (auth or network issue)');
  }

  const existing = databases.find((db) => db.name === DB_NAME);
  if (existing?.uuid) {
    log.ok(`Found existing D1 database "${DB_NAME}" (${existing.uuid})`);
    if (updateWranglerDatabaseId(existing.uuid)) {
      log.ok('Updated wrangler.toml with database_id');
    }
    return existing.uuid;
  }

  log.info(`Creating remote D1 database "${DB_NAME}"...`);
  const createdId = createRemoteDatabase();
  if (updateWranglerDatabaseId(createdId)) {
    log.ok('Updated wrangler.toml with new database_id');
  }
  return createdId;
}

function runMigration(remote) {
  const location = remote ? 'remote' : 'local';
  log.info(`Running ${location} migration...`);
  runWrangler([
    'd1',
    'execute',
    DB_NAME,
    remote ? '--remote' : '--local',
    `--file=${MIGRATION_FILE}`,
  ]);
  log.ok(`${location} migration complete`);
}

function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

function ensureDevVars() {
  const exportPlaceholder = 'generate-or-paste-export-secret';
  const saltPlaceholder = 'generate-or-paste-ip-salt';

  let content;
  let created = false;

  if (!existsSync(DEV_VARS)) {
    if (existsSync(DEV_VARS_EXAMPLE)) {
      content = readFileSync(DEV_VARS_EXAMPLE, 'utf8');
      created = true;
    } else {
      content = [
        '# Local Pages Functions secrets (wrangler pages dev)',
        '# Copy to .dev.vars — never commit .dev.vars',
        `WAITLIST_EXPORT_SECRET=${exportPlaceholder}`,
        `WAITLIST_IP_SALT=${saltPlaceholder}`,
        '',
      ].join('\n');
      created = true;
    }
  } else {
    content = readFileSync(DEV_VARS, 'utf8');
  }

  let changed = false;
  if (content.includes(exportPlaceholder)) {
    content = content.replace(
      exportPlaceholder,
      generateSecret()
    );
    changed = true;
  }
  if (content.includes(saltPlaceholder)) {
    content = content.replace(saltPlaceholder, generateSecret(16));
    changed = true;
  }

  if (created || changed) {
    writeFileSync(DEV_VARS, content, 'utf8');
    log.ok(
      created
        ? 'Created .dev.vars with generated secrets (local dev only)'
        : 'Updated .dev.vars placeholders with generated secrets'
    );
  } else {
    log.ok('.dev.vars already configured');
  }

  return parseDevVars(content);
}

function parseDevVars(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return vars;
}

function pushPagesSecret(name, value) {
  log.info(`Setting Pages secret ${name} on project "${PAGES_PROJECT}"...`);
  const result = runWrangler(
    [
      'pages',
      'secret',
      'put',
      name,
      '--project-name',
      PAGES_PROJECT,
    ],
    { input: `${value}\n`, allowFail: true }
  );

  if (result.status === 0) {
    log.ok(`Pages secret ${name} set`);
    return true;
  }

  log.warn(
    `Could not set Pages secret ${name} automatically. Run manually:\n` +
      `  echo <secret> | npx wrangler pages secret put ${name} --project-name=${PAGES_PROJECT}`
  );
  return false;
}

function printSummary({ authenticated, remoteDone, secrets }) {
  console.log('\n--- Setup summary ---');
  console.log(`Auth: ${authenticated ? 'logged in' : 'NOT logged in (remote steps skipped)'}`);
  console.log(`Local D1: ${skipLocal ? 'skipped' : 'migrated'}`);
  console.log(`Remote D1: ${remoteDone ? 'migrated' : 'skipped'}`);
  console.log(`Local secrets: .dev.vars (${secrets.WAITLIST_EXPORT_SECRET ? 'ready' : 'missing'})`);

  if (!authenticated) {
    console.log('\nOne-time manual step (cannot be automated):');
    console.log('  npx wrangler login');
    console.log('Then re-run: npm run setup:waitlist');
  }

  if (authenticated && !pushSecrets) {
    console.log('\nProduction secrets (choose one):');
    console.log(`  npm run setup:waitlist -- --push-secrets`);
    console.log(
      `  echo <secret> | npx wrangler pages secret put WAITLIST_EXPORT_SECRET --project-name=${PAGES_PROJECT}`
    );
    console.log(
      '  Or set WAITLIST_EXPORT_SECRET in Cloudflare dashboard → Pages → heyzuly → Settings → Variables'
    );
  }

  console.log('\nDeploy:');
  console.log('  npm run deploy:pages     # build + wrangler pages deploy');
  console.log('  git push origin main     # if Git-connected Pages auto-deploy is configured');
  console.log('\nLocal dev with API:');
  console.log('  npm run pages:dev');
}

async function main() {
  log.info('Hey Zuly waitlist setup');

  if (!existsSync(WRANGLER_TOML)) {
    log.err('wrangler.toml not found');
    process.exit(1);
  }

  if (!existsSync(MIGRATION_FILE)) {
    log.err(`Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const { authenticated, output: whoamiOutput } = checkAuth();
  if (authenticated) {
    log.ok('Wrangler authenticated');
  } else {
    log.warn('Wrangler not authenticated — remote steps will be skipped');
    if (whoamiOutput) {
      log.info(whoamiOutput.split('\n').slice(-2).join(' '));
    }
  }

  let remoteDone = false;

  if (!skipLocal) {
    try {
      runMigration(false);
    } catch (err) {
      log.err(`Local migration failed: ${err.message}`);
      process.exit(1);
    }
  }

  if (authenticated && !skipRemote) {
    try {
      resolveRemoteDatabaseId();
      runMigration(true);
      remoteDone = true;
    } catch (err) {
      log.warn(`Remote setup failed: ${err.message}`);
      log.warn('Fix auth/network and re-run npm run setup:waitlist');
    }
  }

  const secrets = ensureDevVars();

  if (authenticated && pushSecrets) {
    if (secrets.WAITLIST_EXPORT_SECRET) {
      pushPagesSecret('WAITLIST_EXPORT_SECRET', secrets.WAITLIST_EXPORT_SECRET);
    }
    if (secrets.WAITLIST_IP_SALT) {
      pushPagesSecret('WAITLIST_IP_SALT', secrets.WAITLIST_IP_SALT);
    }
  }

  printSummary({ authenticated, remoteDone, secrets });

  if (!authenticated) {
    process.exit(2);
  }
}

main().catch((err) => {
  log.err(err.message);
  process.exit(1);
});
