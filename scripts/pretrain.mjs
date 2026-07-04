/*
 * Gene-pool pretraining driver (headless, Option B) — parallel island model.
 *
 * Starts one Vite dev server (COOP/COEP headers for SharedArrayBuffer) and one
 * headless Chromium, then trains N ISOLATED gene pools in parallel — one per
 * Playwright browser context (isolated IndexedDB), so they never contend on the
 * shared pool. Each context plays games back-to-back and evolves its own pool;
 * the driver then MERGES the islands into a single pool (pooling per-genotype
 * fitness and keeping the best) and writes it out.
 *
 * Each game-pair is mostly blocked on Atomics.wait (~1 core), so N islands run
 * with near-linear speedup up to the core count.
 *
 * Resumes from the bundled pool by default (every run builds on it); --reset
 * wipes each island to a fresh random pool.
 *
 * Usage:
 *   npm run pretrain                         # cpus islands, 100 games total, build on pool
 *   npm run pretrain -- --jobs=4 --runs=200  # 4 islands x 50 games each
 *   npm run pretrain -- --reset --runs=400   # start over, split across all cores
 *   npm run pretrain -- --jobs=1             # serial (one island, no merge)
 *
 * Args: --runs=N (total)  --jobs=N (islands, default=cpus)  --until=<m><op><v>
 *       --seed=random|<n>  --base=<n>  --out=<file>  --log=<file>  --reset  --timeout=<ms>
 * Env:  CHROMIUM_EXE=<path to a chromium/headless-shell binary>
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { parsePool, meanScore, mergePools } from './genepool.mjs';
import { findChromium } from './chromium.mjs';

function parseArgs() {
  const a = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) a[m[1]] = m[2] === undefined ? 'true' : m[2];
  }
  return a;
}
const args = parseArgs();
const totalRuns = Math.max(1, parseInt(args.runs || '100', 10));
const jobs = Math.max(1, parseInt(args.jobs || String(cpus().length), 10));
const runsPerJob = Math.max(1, Math.ceil(totalRuns / jobs));
const until = String(args.until || '');
const seed = String(args.seed || 'random');
const base = String(args.base || '');
const outPool = String(args.out || 'public/wasm/GenePool544.pretrained');
const logOut = String(args.log || 'pretrain-log.txt');
const reset = args.reset !== undefined && args.reset !== 'false' ? '1' : '0';
const timeout = String(args.timeout || 45000);
// Resume islands all seed from this bundled pool; the merge subtracts it so its
// games are counted once, not once per island. Null for a --reset run.
const bundledPool = 'public/wasm/GenePool544.pretrained';
const baseText = reset === '0' && existsSync(bundledPool) ? readFileSync(bundledPool, 'utf8') : null;

// Gene-pool parse/merge (format docs + invariants) live in ./genepool.mjs.

// ---- chromium + vite --------------------------------------------------------
const EXE = findChromium();
if (!EXE) {
  console.error('No Chromium found. Set CHROMIUM_EXE, or run: npx playwright install chromium');
  process.exit(1);
}

const server = await createServer({ mode: 'development', logLevel: 'warn' });
await server.listen();
const local = server.resolvedUrls?.local?.[0];
if (!local) { console.error('pretrain: could not resolve the Vite dev URL'); await server.close(); process.exit(1); }
const islandUrl = () => `${local.replace(/\/$/, '')}/pretrain.html?${new URLSearchParams({ runs: String(runsPerJob), until, seed, base, reset, timeout }).toString()}`;

console.log(`pretrain: ${jobs} island(s) x ${runsPerJob} games = ${jobs * runsPerJob} total  (reset=${reset}, timeout=${timeout}ms)`);
console.log('pretrain: exe', EXE);

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox'] });

// Run one island to completion in its own isolated context; return its pool + log.
async function runIsland(label) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error(`[${label}] page error:`, e.message));
    await page.goto(islandUrl(), { waitUntil: 'domcontentloaded' });
    let last = -1, stall = 0;
    for (;;) {
      const st = await page.evaluate(() => {
        const p = window.__pretrain;
        return p ? { gamesDone: p.gamesDone, done: p.done, coi: p.crossOriginIsolated, error: p.error, stats: p.poolStats } : null;
      }).catch(() => null);
      if (st) {
        if (st.coi === false) { console.error(`[${label}] crossOriginIsolated is FALSE — aborting`); break; }
        if (st.gamesDone !== last) {
          last = st.gamesDone; stall = 0;
          const s = st.stats;
          console.log(`pretrain: [${label}] game ${st.gamesDone}/${runsPerJob}` + (s ? `  trials=${s.trialno} meanLvl=${s.meanLevel.toFixed(2)} meanScore=${s.meanScore.toFixed(0)} hiScore=${s.highScore} hiLvl=${s.highLevel}` : ''));
        } else stall++;
        if (st.done) { if (st.error) console.error(`[${label}] harness error:`, st.error); break; }
      } else stall++;
      if (stall > 900) { console.error(`[${label}] stalled ~15min — aborting`); break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return await page.evaluate(async () => {
      const st = window.__pretrain || {};
      let pool = null;
      try {
        const db = await new Promise((res, rej) => { const r = indexedDB.open('/var/games/rogomatic'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const rec = await new Promise((res) => { const t = db.transaction('FILE_DATA', 'readonly').objectStore('FILE_DATA').get('/var/games/rogomatic/GenePool544'); t.onsuccess = () => res(t.result); t.onerror = () => res(null); });
        db.close();
        if (rec && rec.contents) pool = Array.from(rec.contents);
      } catch { /* ignore */ }
      return { pool, log: st.log || [], stats: st.poolStats || null, gamesDone: st.gamesDone || 0 };
    }).catch((e) => ({ pool: null, log: [`extract failed: ${e}`], stats: null, gamesDone: 0 }));
  } catch (e) {
    console.error(`[${label}] failed:`, e && e.message ? e.message : e);
    return { pool: null, log: [`[${label}] error: ${e}`], stats: null, gamesDone: 0 };
  } finally {
    await context.close().catch(() => {});
  }
}

let exitCode = 0;
try {
  const labels = Array.from({ length: jobs }, (_, i) => (jobs > 1 ? `island ${i + 1}` : 'run'));
  const results = await Promise.all(labels.map((l) => runIsland(l)));

  const allLog = results.flatMap((r, i) => (r.log || []).map((l) => (jobs > 1 ? `[island ${i + 1}] ${l}` : l)));
  writeFileSync(logOut, allLog.join('\n') + '\n');
  console.log(`pretrain: wrote ${logOut} (${allLog.length} lines)`);

  const pools = results.filter((r) => r.pool && r.pool.length).map((r) => Buffer.from(r.pool));

  // Ratchet: a run only overwrites the pool if it improved it — a new peak
  // (deeper, or higher score at the same depth), or the same peak with an
  // equal-or-better mean. A --reset run has no base and always writes.
  const bp = baseText ? parsePool(baseText) : null;
  const baseStats = bp ? { maxScore: bp.gScore.max, maxLevel: bp.gLevel.max, meanScore: meanScore(bp.gScore) } : null;
  const improvedOver = (c) =>
    !baseStats ||
    c.maxLevel > baseStats.maxLevel ||
    (c.maxLevel === baseStats.maxLevel && c.maxScore > baseStats.maxScore) ||
    (c.maxLevel === baseStats.maxLevel && c.maxScore === baseStats.maxScore && c.meanScore >= baseStats.meanScore);

  if (!pools.length) {
    console.error('pretrain: NO gene pool produced');
    exitCode = 5;
  } else if (jobs === 1) {
    const s = results[0].stats || {};
    if (improvedOver({ maxScore: s.highScore || 0, maxLevel: s.highLevel || 0, meanScore: s.meanScore || 0 })) {
      writeFileSync(outPool, pools[0]);
      console.log(`pretrain: wrote ${outPool} (${pools[0].length} bytes) after ${results[0].gamesDone} games`);
      console.log('pretrain: final stats', results[0].stats);
    } else {
      writeFileSync(outPool, baseText);
      console.log(`pretrain: run did NOT improve the pool (meanScore ${(s.meanScore || 0).toFixed(0)} < base ${baseStats.meanScore.toFixed(0)}) — kept the existing pool unchanged`);
    }
  } else {
    const merged = mergePools(pools.map((b) => b.toString('utf8')), baseText, 20);
    if (!merged) { console.error('pretrain: merge produced no pool'); exitCode = 5; }
    else {
      // Ratchet: only overwrite the pool if this run improved it — reached a new
      // peak (deeper, or higher score at the same depth), or matched the peak
      // with an equal-or-better mean. A --reset run has no base to beat, so it
      // always writes.
      const improved = improvedOver({ maxScore: merged.maxScore, maxLevel: merged.maxLevel, meanScore: merged.meanScore });
      if (improved) {
        writeFileSync(outPool, merged.text);
        console.log(`pretrain: merged ${pools.length}/${jobs} islands -> ${outPool} (${merged.genotypes} genotypes, ${merged.trials} trials)`);
        console.log(`pretrain: improved the pool — maxScore ${merged.maxScore} (base ${merged.baseMaxScore}), maxLevel ${merged.maxLevel} (base ${merged.baseMaxLevel}), meanScore ${merged.meanScore.toFixed(0)} (base ${merged.baseMeanScore.toFixed(0)})`);
      } else {
        writeFileSync(outPool, baseText);
        console.log(`pretrain: run did NOT improve the pool (same peak ${merged.maxScore}/L${merged.maxLevel}, meanScore ${merged.meanScore.toFixed(0)} < base ${merged.baseMeanScore.toFixed(0)}) — kept the existing pool unchanged`);
      }
    }
  }
} catch (e) {
  console.error('pretrain: fatal', e);
  exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
process.exit(exitCode);
