import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONFIG_FILE = join(ROOT, 'heyzuly.chrome.json');
export const CONFIG_EXAMPLE = join(ROOT, 'heyzuly.chrome.json.example');

const HEYZULY_NAMES = ['heyzuly', 'hey zuly'];

export function getChromeUserDataDir() {
  const localAppData = process.env.LOCALAPPDATA;
  const appData = process.env.APPDATA;

  switch (platform()) {
    case 'win32':
      return localAppData
        ? join(localAppData, 'Google', 'Chrome', 'User Data')
        : null;
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    default:
      return join(homedir(), '.config', 'google-chrome');
  }
}

export function getChromeExecutable(config = {}) {
  if (config.chromePath && existsSync(config.chromePath)) {
    return config.chromePath;
  }

  const candidates =
    platform() === 'win32'
      ? [
          join(
            process.env.LOCALAPPDATA || '',
            'Google',
            'Chrome',
            'Application',
            'chrome.exe'
          ),
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]
      : platform() === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            join(
              homedir(),
              'Applications',
              'Google Chrome.app',
              'Contents',
              'MacOS',
              'Google Chrome'
            ),
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
          ];

  return candidates.find((path) => path && existsSync(path)) ?? null;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function listProfileDirectories(userDataDir) {
  if (!userDataDir || !existsSync(userDataDir)) {
    return [];
  }

  return readdirSync(userDataDir).filter((entry) =>
    /^(Default|Profile( \d+)?)$/.test(entry)
  );
}

function normalizeProfileName(name) {
  return (name || '').trim().toLowerCase();
}

function profileNameScore(name) {
  const normalized = normalizeProfileName(name);
  if (!normalized) {
    return 0;
  }

  for (const target of HEYZULY_NAMES) {
    if (normalized === target) {
      return 100;
    }
  }

  if (normalized.includes('heyzuly')) {
    return 80;
  }

  return 0;
}

export function detectProfiles(userDataDir = getChromeUserDataDir()) {
  if (!userDataDir || !existsSync(userDataDir)) {
    return [];
  }

  const localState = readJson(join(userDataDir, 'Local State'));
  const infoCache = localState?.profile?.info_cache ?? {};
  const directories = new Set([
    ...listProfileDirectories(userDataDir),
    ...Object.keys(infoCache),
  ]);

  const profiles = [];

  for (const directory of directories) {
    const prefsPath = join(userDataDir, directory, 'Preferences');
    if (!existsSync(prefsPath)) {
      continue;
    }

    const prefs = readJson(prefsPath);
    const cacheEntry = infoCache[directory] ?? {};
    const name = prefs?.profile?.name || cacheEntry.name || '';
    const stats = statSync(prefsPath);

    profiles.push({
      directory,
      name,
      gaiaName: cacheEntry.gaia_name || '',
      score: profileNameScore(name),
      lastModified: stats.mtimeMs,
    });
  }

  return profiles.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.lastModified - a.lastModified;
  });
}

export function findHeyzulyProfile(userDataDir = getChromeUserDataDir()) {
  const profiles = detectProfiles(userDataDir);
  return profiles.find((profile) => profile.score > 0) ?? null;
}

export function loadConfig() {
  const envProfile = process.env.HEYZULY_CHROME_PROFILE?.trim();
  const envChromePath = process.env.HEYZULY_CHROME_PATH?.trim();
  const envUrl = process.env.HEYZULY_CHROME_URL?.trim();

  let fileConfig = {};
  if (existsSync(CONFIG_FILE)) {
    fileConfig = readJson(CONFIG_FILE) || {};
  }

  const profileDirectory =
    envProfile || fileConfig.profileDirectory || null;
  const chromePath = envChromePath || fileConfig.chromePath || null;
  const defaultUrl = envUrl || fileConfig.defaultUrl || null;

  return {
    chromePath,
    profileDirectory,
    profileName: fileConfig.profileName || 'heyzuly',
    defaultUrl,
    userDataDir: getChromeUserDataDir(),
  };
}

export function resolveChromeLaunchConfig(options = {}) {
  const config = loadConfig();
  let profileDirectory = options.profileDirectory || config.profileDirectory;
  let profileName = config.profileName;

  if (!profileDirectory) {
    const detected = findHeyzulyProfile(config.userDataDir);
    if (detected) {
      profileDirectory = detected.directory;
      profileName = detected.name;
    }
  }

  const chromePath = getChromeExecutable(config);

  return {
    chromePath,
    profileDirectory,
    profileName,
    userDataDir: config.userDataDir,
    defaultUrl: options.url || config.defaultUrl || 'http://localhost:4321',
  };
}

export function writeConfigFromDetection(userDataDir = getChromeUserDataDir()) {
  const detected = findHeyzulyProfile(userDataDir);
  const chromePath = getChromeExecutable();

  if (!detected) {
    return { written: false, detected: null, chromePath };
  }

  const payload = {
    chromePath: chromePath || undefined,
    profileDirectory: detected.directory,
    profileName: detected.name,
    defaultUrl: 'http://localhost:4321',
  };

  writeFileSync(CONFIG_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return { written: true, detected, chromePath, payload };
}
