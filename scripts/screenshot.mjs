/*
 * Capture an og:image / promo screenshot of the app mid-game at a decent depth.
 *
 * Starts the Vite dev server, loads the real app in headless Chromium, runs
 * Rog-O-Matic (with auto-restart) until a game reaches --target dungeon level,
 * lets it explore for a moment, then screenshots the full UI at the viewport
 * size (default 1920x1080; pass --width/--height for other sizes, e.g. a
 * 1200x630 og:image) to <out> (served copy) and its basename at the repo root.
 *
 * Because it captures at the requested size directly, the responsive UI lays
 * itself out to fit — no cropping, nothing trimmed.
 *
 * Usage: npm run screenshot -- --target=4 --timeout=300000 [--seed=12345]
 *        npm run og-image      # = --width=1200 --height=630 --out=public/og-image.png
 * Env:   CHROMIUM_EXE=<path to a chromium/headless-shell binary>
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { copyFileSync } from 'node:fs';
import { basename } from 'node:path';
import { findChromium } from './chromium.mjs';

const args = {};
for (const a of process.argv.slice(2)) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) args[m[1]] = m[2] ?? 'true'; }
const TARGET = Math.max(2, parseInt(args.target || '4', 10));
const MAXWAIT = parseInt(args.timeout || '300000', 10);
const OUT = args.out || 'public/screenshot.png';
const WIDTH = Math.max(320, parseInt(args.width || '1920', 10));
const HEIGHT = Math.max(240, parseInt(args.height || '1080', 10));
const SEED = args.seed && args.seed !== 'true' ? String(args.seed) : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chromium detection (version-agnostic) lives in ./chromium.mjs.
const EXE = findChromium();
if (!EXE) { console.error('No Chromium found. Set CHROMIUM_EXE, or run: npx playwright install chromium'); process.exit(1); }

const server = await createServer({ mode: 'development', logLevel: 'warn' });
await server.listen();
const local = server.resolvedUrls?.local?.[0]?.replace(/\/$/, '');
const url = `${local}/`; // vite serves the app under the /rogoweb/ base
console.log('screenshot: url', url, `| ${WIDTH}x${HEIGHT} | target level`, TARGET, SEED ? `| seed ${SEED}` : '| random');

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
// Force Rog-O-Matic ("auto") mode before the app's JS runs — a fresh headless
// context has no localStorage, and this survives any navigation the app makes.
await context.addInitScript(() => { try { window.localStorage.setItem('rogoweb-mode', 'auto'); } catch { /* ignore */ } });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[page error]', e.message));

let exitCode = 0;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // This script drives restarts itself (the loop below clicks START whenever a
  // game ends and the UI goes idle), so leave AUTO RESTART *off*: the app's own
  // auto-restart reloads the page (rogue's onExit → handleExit → location.reload),
  // which would wipe these settings mid-run. Optional deterministic seed.
  await page.evaluate((seed) => {
    const a = document.getElementById('autorestart-toggle'); if (a) a.checked = false;
    if (seed) {
      const s = document.getElementById('seed-input'); if (s) s.value = seed;
      const r = document.getElementById('randomise-toggle'); if (r) r.checked = false;
    }
  }, SEED);

  // Wait for the runtime to enable START, then start Rog-O-Matic.
  await page.waitForFunction(() => { const b = document.getElementById('btn-start'); return b && !b.disabled; }, { timeout: 90000 });
  await page.click('#btn-start');
  console.log('screenshot: started — waiting to reach level', TARGET);

  // Capture the DEEPEST level the bot has actually EXPLORED (map revealed), not
  // the moment it arrives on a fresh, mostly-dark level. Only capture once the
  // bot has spent a while on the current level, and keep the deepest such view;
  // restarts / fresh arrivals never overwrite it.
  const SETTLE = Math.max(3, parseInt(args.settle || '28', 10)); // seconds on a level before it's "explored enough" to shoot
  const t0 = Date.now();
  let bestLevel = 0, curLevel = 1, enteredAt = Date.now(), games = 1;
  for (;;) {
    const st = await page.evaluate(() => {
      const b = document.getElementById('btn-start');
      return {
        lvl: parseInt(document.getElementById('stat-level')?.textContent || '1', 10) || 1,
        idle: !!b && !b.disabled, // START re-enabled ⇒ the previous game ended
      };
    }).catch(() => ({ lvl: curLevel, idle: false }));

    if (st.idle) {
      // Previous game ended (bot died) — start the next one ourselves. No app
      // auto-restart, so no page reload; games run back-to-back in one context,
      // and the gene pool keeps evolving in IDBFS across them.
      await page.click('#btn-start').catch(() => {});
      games++;
      curLevel = 1; enteredAt = Date.now();
      await sleep(1500);
    } else {
      if (st.lvl !== curLevel) { curLevel = st.lvl; enteredAt = Date.now(); }
      const onLevel = (Date.now() - enteredAt) / 1000;
      if (st.lvl >= 2 && onLevel > SETTLE && st.lvl >= bestLevel) {
        await page.screenshot({ path: OUT });
        if (st.lvl > bestLevel) console.log(`screenshot: captured explored level ${st.lvl}  (game ${games}, ${((Date.now() - t0) / 1000) | 0}s)`);
        bestLevel = st.lvl;
      }
    }
    if (bestLevel >= TARGET) { console.log(`screenshot: reached an explored level ${TARGET}`); break; }
    if (Date.now() - t0 > MAXWAIT) { console.log(`screenshot: timeout — deepest explored level ${bestLevel || 1} after ${games} games`); break; }
    await sleep(1500);
  }
  if (bestLevel === 0) { await page.screenshot({ path: OUT }); console.log('screenshot: no explored level >= 2 — captured current'); }
  // Mirror the served copy (public/foo.png) to the repo root (./foo.png) for the
  // README / repo preview. Skip for an out-of-tree --out (e.g. a scratch path).
  let rootCopy = '';
  if (OUT.startsWith('public/')) { rootCopy = basename(OUT); copyFileSync(OUT, rootCopy); }
  console.log(`screenshot: wrote ${OUT}${rootCopy ? ' + ' + rootCopy : ''} (deepest explored level ${bestLevel || 1})`);
} catch (e) {
  console.error('screenshot: fatal', e);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
process.exit(exitCode);
