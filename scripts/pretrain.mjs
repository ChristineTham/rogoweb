/*
 * Gene-pool pretraining driver (headless, Option B).
 *
 * Starts the project's Vite dev server (which applies the COOP/COEP headers
 * needed for SharedArrayBuffer), launches a headless Chromium, loads
 * pretrain.html — which plays games back-to-back and evolves the gene pool in
 * IDBFS — then extracts the resulting GenePool544 to disk plus a log file.
 *
 * Resumes from the bundled pool by default (every run builds on it); pass
 * --reset to wipe it and start a fresh random pool.
 *
 * Usage:
 *   node scripts/pretrain.mjs --runs=100            # builds on the bundled pool
 *   node scripts/pretrain.mjs --reset --runs=100    # start over from a random pool
 *   node scripts/pretrain.mjs --runs=500 --until=meanLevel>=6
 *
 * Args: --runs=N  --until=<metric><op><value>  --seed=random|<n>  --base=<n>
 *       --out=<file>  --log=<file>  --reset  --timeout=<ms>
 * Env:  CHROMIUM_EXE=<path to a chromium/headless-shell binary>
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

function parseArgs() {
  const a = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) a[m[1]] = m[2] === undefined ? 'true' : m[2];
  }
  return a;
}
const args = parseArgs();
const runs = String(args.runs || 100);
const until = String(args.until || '');
const seed = String(args.seed || 'random');
const base = String(args.base || '');
const outPool = String(args.out || 'public/wasm/GenePool544.pretrained');
const logOut = String(args.log || 'pretrain-log.txt');
// Resume is the default (seed from + evolve the bundled pool); --reset wipes it.
const reset = args.reset !== undefined && args.reset !== 'false' ? '1' : '0';
const timeout = String(args.timeout || 45000);

// Cached Playwright chromium (headless shell). Override with CHROMIUM_EXE.
const CANDIDATES = [
  process.env.CHROMIUM_EXE,
  `${homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  `${homedir()}/Library/Caches/ms-playwright/chromium-1217/chrome-mac/Chromium.app/Contents/MacOS/Chromium`,
].filter(Boolean);
const EXE = CANDIDATES.find((p) => existsSync(p));
if (!EXE) {
  console.error('No Chromium found. Set CHROMIUM_EXE, or run: npx playwright install chromium');
  console.error('Looked in:\n  ' + CANDIDATES.join('\n  '));
  process.exit(1);
}

const server = await createServer({ mode: 'development', logLevel: 'warn' });
await server.listen();
const local = server.resolvedUrls?.local?.[0];
if (!local) {
  console.error('pretrain: could not resolve the Vite dev URL');
  await server.close();
  process.exit(1);
}
const q = new URLSearchParams({ runs, until, seed, base, reset, timeout });
const url = `${local.replace(/\/$/, '')}/pretrain.html?${q.toString()}`;
console.log('pretrain: exe   ', EXE);
console.log('pretrain: url   ', url);

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page error]', e.message));

let exitCode = 0;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  let lastGame = -1;
  let stall = 0;
  for (;;) {
    const st = await page
      .evaluate(() => {
        const p = window.__pretrain;
        return p ? { gamesDone: p.gamesDone, maxRuns: p.maxRuns, done: p.done, coi: p.crossOriginIsolated, error: p.error, stats: p.poolStats } : null;
      })
      .catch(() => null);

    if (st) {
      if (st.coi === false) { console.error('pretrain: crossOriginIsolated is FALSE (missing COOP/COEP) — aborting'); exitCode = 2; break; }
      if (st.gamesDone !== lastGame) {
        lastGame = st.gamesDone;
        stall = 0;
        const s = st.stats;
        console.log(
          `pretrain: game ${st.gamesDone}/${st.maxRuns}` +
            (s ? `  trials=${s.trialno} births=${s.births} meanLvl=${s.meanLevel.toFixed(2)} meanScore=${s.meanScore.toFixed(0)} hiScore=${s.highScore} hiLvl=${s.highLevel}` : '')
        );
      } else {
        stall++;
      }
      if (st.done) { if (st.error) { console.error('pretrain: harness error:', st.error); exitCode = 3; } break; }
    } else {
      stall++;
    }
    if (stall > 900) { console.error('pretrain: stalled ~15min with no progress — aborting'); exitCode = 4; break; }
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Extract the evolved gene pool + captured log.
  const result = await page
    .evaluate(async () => {
      const st = window.__pretrain || {};
      let pool = null;
      try {
        const db = await new Promise((res, rej) => { const r = indexedDB.open('/var/games/rogomatic'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const rec = await new Promise((res) => { const t = db.transaction('FILE_DATA', 'readonly').objectStore('FILE_DATA').get('/var/games/rogomatic/GenePool544'); t.onsuccess = () => res(t.result); t.onerror = () => res(null); });
        db.close();
        if (rec && rec.contents) pool = Array.from(rec.contents);
      } catch { /* ignore */ }
      return { pool, log: st.log || [], stats: st.poolStats || null, gamesDone: st.gamesDone || 0 };
    })
    .catch((e) => ({ pool: null, log: [`[driver] extract failed: ${e}`], stats: null, gamesDone: 0 }));

  writeFileSync(logOut, (result.log || []).join('\n') + '\n');
  console.log(`pretrain: wrote ${logOut} (${(result.log || []).length} lines)`);
  if (result.pool && result.pool.length) {
    writeFileSync(outPool, Buffer.from(result.pool));
    console.log(`pretrain: wrote ${outPool} (${result.pool.length} bytes) after ${result.gamesDone} games`);
    console.log('pretrain: final stats', result.stats);
  } else {
    console.error('pretrain: NO gene pool produced');
    if (exitCode === 0) exitCode = 5;
  }
} catch (e) {
  console.error('pretrain: fatal', e);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
process.exit(exitCode);
