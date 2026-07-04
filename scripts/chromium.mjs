/*
 * Locate a cached Playwright Chromium without hard-coding the build number (it
 * bumps on every playwright-core update, e.g. 1217 → 1228). Shared by the
 * screenshot, og-image, pretrain, and e2e harnesses.
 *
 * Order of preference: $CHROMIUM_EXE, then the newest cached headless-shell,
 * then the newest cached full Chromium. Returns an absolute path or null.
 */
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';

const REL = {
  'chromium_headless_shell-': [
    'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chrome-headless-shell-mac-x64/chrome-headless-shell',
  ],
  'chromium-': ['chrome-mac/Chromium.app/Contents/MacOS/Chromium'],
};

export function findChromium(cacheDir = `${homedir()}/Library/Caches/ms-playwright`) {
  if (process.env.CHROMIUM_EXE && existsSync(process.env.CHROMIUM_EXE)) return process.env.CHROMIUM_EXE;
  let dirs;
  try { dirs = readdirSync(cacheDir); } catch { return null; }
  for (const prefix of Object.keys(REL)) {
    const newest = dirs
      .filter((d) => d.startsWith(prefix))
      .sort((a, b) => (parseInt(b.slice(prefix.length), 10) || 0) - (parseInt(a.slice(prefix.length), 10) || 0));
    for (const dir of newest) for (const rel of REL[prefix]) {
      const p = `${cacheDir}/${dir}/${rel}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
