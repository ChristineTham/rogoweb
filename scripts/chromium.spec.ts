import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { findChromium } from './chromium.mjs';

const SHELL = 'chrome-headless-shell-mac-arm64/chrome-headless-shell';
const FULL = 'chrome-mac/Chromium.app/Contents/MacOS/Chromium';

function touch(dir: string, rel: string) {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, '');
  return full;
}

describe('findChromium (version-agnostic Chromium detection)', () => {
  let cache: string;
  let savedEnv: string | undefined;

  beforeAll(() => { savedEnv = process.env.CHROMIUM_EXE; });
  afterAll(() => {
    if (savedEnv === undefined) delete process.env.CHROMIUM_EXE;
    else process.env.CHROMIUM_EXE = savedEnv;
  });
  beforeEach(() => {
    delete process.env.CHROMIUM_EXE;
    cache = mkdtempSync(path.join(tmpdir(), 'ms-pw-'));
  });
  afterEach(() => rmSync(cache, { recursive: true, force: true }));

  it('returns null when the cache dir does not exist', () => {
    expect(findChromium(path.join(cache, 'nope'))).toBeNull();
  });

  it('finds a cached headless-shell binary', () => {
    const exe = touch(cache, `chromium_headless_shell-1228/${SHELL}`);
    expect(findChromium(cache)).toBe(exe);
  });

  it('picks the newest build number (survives 1217 → 1228 bumps)', () => {
    touch(cache, `chromium_headless_shell-1217/${SHELL}`);
    touch(cache, `chromium_headless_shell-1203/${SHELL}`);
    const newest = touch(cache, `chromium_headless_shell-1228/${SHELL}`);
    expect(findChromium(cache)).toBe(newest);
  });

  it('prefers the headless-shell over the full Chromium', () => {
    const shell = touch(cache, `chromium_headless_shell-1228/${SHELL}`);
    touch(cache, `chromium-1228/${FULL}`);
    expect(findChromium(cache)).toBe(shell);
  });

  it('falls back to the full Chromium when no headless-shell is cached', () => {
    const full = touch(cache, `chromium-1228/${FULL}`);
    expect(findChromium(cache)).toBe(full);
  });

  it('honours $CHROMIUM_EXE when it points at a real file', () => {
    const custom = touch(cache, 'custom/chrome');
    process.env.CHROMIUM_EXE = custom;
    touch(cache, `chromium_headless_shell-1228/${SHELL}`); // present but overridden
    expect(findChromium(cache)).toBe(custom);
  });

  it('ignores $CHROMIUM_EXE when the path is missing', () => {
    process.env.CHROMIUM_EXE = path.join(cache, 'does-not-exist');
    const exe = touch(cache, `chromium_headless_shell-1228/${SHELL}`);
    expect(findChromium(cache)).toBe(exe);
  });
});
