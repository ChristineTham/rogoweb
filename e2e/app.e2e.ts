import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer, type ViteDevServer } from 'vite';
import { readFileSync } from 'node:fs';
import { findChromium } from '../scripts/chromium.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const EXE = findChromium();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Poll a browser-side predicate, clicking START whenever the game goes idle, so
// games run back-to-back until the predicate holds or we time out.
async function driveUntil(page: Page, predicate: () => boolean, timeoutMs: number) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.evaluate(predicate)) return true;
    const idle = await page.evaluate(() => {
      const b = document.getElementById('btn-start') as HTMLButtonElement | null;
      return !!b && !b.disabled;
    });
    if (idle) await page.click('#btn-start').catch(() => {});
    await sleep(1500);
  }
  return false;
}

const startReady = () => {
  const b = document.getElementById('btn-start') as HTMLButtonElement | null;
  return !!b && !b.disabled;
};

// Skips cleanly on machines without a cached Chromium (e.g. CI that hasn't run
// `npx playwright install chromium`).
describe.skipIf(!EXE)('rogoweb app (e2e)', () => {
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await createServer({ mode: 'development', logLevel: 'warn' });
    await server.listen();
    const url = (server.resolvedUrls?.local?.[0] ?? '').replace(/\/$/, '') + '/';
    browser = await chromium.launch({ executablePath: EXE!, headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    // Force Rog-O-Matic ("auto") mode regardless of the fresh context's storage.
    await context.addInitScript(() => {
      try { localStorage.setItem('rogoweb-mode', 'auto'); } catch { /* ignore */ }
    });
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  });

  afterAll(async () => {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  });

  it('serves a cross-origin-isolated page titled Rogoweb', async () => {
    expect(await page.title()).toContain('Rogoweb');
    // SharedArrayBuffer (the dual-worker IPC) is gated on cross-origin isolation.
    expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
    expect(await page.evaluate(() => typeof SharedArrayBuffer !== 'undefined')).toBe(true);
  });

  it('exposes the 1200x630 og:image card in the served HTML', async () => {
    expect(await page.getAttribute('meta[property="og:image"]', 'content')).toMatch(/\/og-image\.png$/);
    expect(await page.getAttribute('meta[property="og:image:width"]', 'content')).toBe('1200');
    expect(await page.getAttribute('meta[property="og:image:height"]', 'content')).toBe('630');
  });

  it('renders the version/commit footer from the build-time define', async () => {
    await page.waitForFunction(() => (document.getElementById('app-ver')?.textContent || '').startsWith('v'), { timeout: 30_000 });
    expect(await page.textContent('#app-ver')).toBe(`v${pkg.version}`);
    const commit = (await page.textContent('#app-commit'))?.trim();
    expect(commit).toBeTruthy();
    expect(commit).not.toBe('?'); // populated from the __GIT_COMMIT__ define
  });

  it('enables START once the WASM runtime is ready', async () => {
    await page.waitForFunction(startReady, { timeout: 90_000 });
    expect(await page.isDisabled('#btn-start')).toBe(false);
  });

  it('plays Rog-O-Matic: telemetry, gene pool and descent milestones update, with no debug leaks', async () => {
    await page.waitForFunction(startReady, { timeout: 90_000 });
    await page.click('#btn-start');

    // Live telemetry: turns advance and the gene-pool size is surfaced as a stat.
    await page.waitForFunction(() => {
      const turns = parseInt(document.getElementById('bot-turns')?.textContent || '0', 10);
      const pool = parseInt(document.getElementById('stat-pool')?.textContent || '0', 10);
      return turns > 0 && pool > 0;
    }, { timeout: 60_000 });
    expect(parseInt((await page.textContent('#stat-pool')) || '0', 10)).toBeGreaterThan(0);

    // The new-game banner records the running version.
    expect(await page.textContent('#observer-log')).toContain(`rogoweb v${pkg.version}`);

    // Back-to-back games until a descent milestone is logged (proves the
    // observer-log play-by-play added in v1.0.0 fires from real gameplay).
    const descended = await driveUntil(
      page,
      () => (document.getElementById('observer-log')?.textContent || '').includes('Descended to dungeon level'),
      120_000,
    );
    expect(descended).toBe(true);

    // The status panel surfaces genuine status, never raw rogomatic debug output.
    const log = (await page.textContent('#observer-log')) || '';
    expect(log).not.toMatch(/\bD_[A-Z]+\b/); // debug-flag names (D_BATTLE, …)
    expect(log.toLowerCase()).not.toContain('dwait');
  });
});
