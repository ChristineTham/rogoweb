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
import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir, cpus } from 'node:os';

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

// ---- gene-pool merge (island model) -----------------------------------------
// Pool format: "<inittime> <trial> <lastid> <cross> <shift> <mut>|<score>|<level>|"
// then one line per genotype: "<id> <creat> <fa> <mo>|<dna x8>|<score>|<level>|"
// stat = "count sum sumsq min max". father/mother are logging-only (learn.c).
const parseStat = (s) => { const [c, su, sq, mn, mx] = (s || '').trim().split(/\s+/).map(Number); return { count: c || 0, sum: su || 0, sumsq: sq || 0, min: mn || 0, max: mx || 0 }; };
const statStr = (s) => `${s.count} ${s.sum} ${s.sumsq} ${s.min} ${s.max}`;
const meanScore = (s) => (s.count ? s.sum / s.count : -1);

function parsePool(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const hcols = lines[0].split('|');
  const hn = hcols[0].trim().split(/\s+/).map(Number);
  const genes = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split('|');
    if (p.length < 4) continue;
    const dna = p[1].trim().split(/\s+/).map(Number);
    if (dna.length < 8) continue;
    genes.push({ dna, score: parseStat(p[2]), level: parseStat(p[3]) });
  }
  // gScore/gLevel are the pool's GLOBAL stats (cumulative, incl. replaced genotypes).
  return { inittime: hn[0] || 0, trialno: hn[1] || 0, crosses: hn[3] || 0, shifts: hn[4] || 0, mutations: hn[5] || 0, gScore: parseStat(hcols[1]), gLevel: parseStat(hcols[2]), genes };
}

// Merge one genotype's stat across the islands that played it. When islands
// resumed from a shared `base`, subtract the base from each island's cumulative
// stat so the base's games are counted once — not once per island. (For --reset
// islands base is null → a plain sum.) count/sum/sumsq are additive; min/max are
// extremes (island stats already include the base, so extremes cover it).
function mergeStat(base, islandStats) {
  const b = base || { count: 0, sum: 0, sumsq: 0, min: 0, max: 0 };
  let count = b.count, sum = b.sum, sumsq = b.sumsq;
  let min = b.count ? b.min : Infinity, max = b.count ? b.max : -Infinity;
  for (const s of islandStats) {
    count += s.count - b.count;
    sum += s.sum - b.sum;
    sumsq += s.sumsq - b.sumsq;
    if (s.count) { min = Math.min(min, s.min); max = Math.max(max, s.max); }
  }
  return { count: Math.max(0, Math.round(count)), sum: Math.round(sum), sumsq: Math.round(sumsq), min: isFinite(min) ? min : 0, max: isFinite(max) ? max : 0 };
}

function mergePools(islandTexts, baseText, targetSize) {
  const islands = islandTexts.map(parsePool).filter(Boolean);
  if (!islands.length) return null;
  const base = baseText ? parsePool(baseText) : null;
  const baseByDna = new Map();
  if (base) for (const g of base.genes) baseByDna.set(g.dna.join(','), g);

  // Group every genotype (across all islands) by DNA, collecting per-island stats.
  const byDna = new Map();
  for (const isl of islands) for (const g of isl.genes) {
    const key = g.dna.join(',');
    if (!byDna.has(key)) byDna.set(key, { dna: g.dna, score: [], level: [] });
    const e = byDna.get(key); e.score.push(g.score); e.level.push(g.level);
  }
  if (base) for (const g of base.genes) { const key = g.dna.join(','); if (!byDna.has(key)) byDna.set(key, { dna: g.dna, score: [], level: [] }); }

  const genes = [...byDna.values()].map((e) => {
    const b = baseByDna.get(e.dna.join(','));
    return { dna: e.dna, score: mergeStat(b && b.score, e.score), level: mergeStat(b && b.level, e.level) };
  });
  // Elitist, no-regression selection: rank by an evidence-weighted score (the
  // mean shrunk toward 0 by trial count) so a lucky low-sample genotype can't
  // displace a well-tested one — a genotype is only replaced by a *robustly*
  // better one. Deeper / higher-peak break ties.
  const rankFit = (s) => s.sum / (s.count + 3);
  genes.sort((a, b) => {
    const d = rankFit(b.score) - rankFit(a.score);
    if (d) return d;
    if (b.level.max !== a.level.max) return b.level.max - a.level.max;
    return b.score.max - a.score.max;
  });
  // Keep the pool at its existing size — never grow or shrink it.
  const size = base ? Math.max(1, base.genes.length) : targetSize;
  const sel = genes.slice(0, size);

  // Header: base games + each island's NEW games; stats aggregate the selected genes.
  const baseT = base ? base.trialno : 0;
  let trialno = baseT, crosses = base ? base.crosses : 0, shifts = base ? base.shifts : 0, mut = base ? base.mutations : 0;
  const inittime = base ? base.inittime : islands[0].inittime || 0;
  for (const isl of islands) { trialno += isl.trialno - baseT; crosses += isl.crosses - (base ? base.crosses : 0); shifts += isl.shifts - (base ? base.shifts : 0); mut += isl.mutations - (base ? base.mutations : 0); }
  // Header stats are the pool's GLOBAL cumulative stats (they outlive replaced
  // genotypes), so carry base-global + each island's new games — not a sum over
  // the current genotypes.
  const aggS = mergeStat(base && base.gScore, islands.map((i) => i.gScore));
  const aggL = mergeStat(base && base.gLevel, islands.map((i) => i.gLevel));
  // No-regression: the pool's peak score/level can never drop below the base's.
  if (base) { aggS.max = Math.max(aggS.max, base.gScore.max); aggL.max = Math.max(aggL.max, base.gLevel.max); }
  const lines = [[`${inittime} ${Math.max(trialno, sel.length)} ${sel.length} ${Math.max(0, crosses)} ${Math.max(0, shifts)} ${Math.max(0, mut)}`, statStr(aggS), statStr(aggL), ''].join('|')];
  sel.forEach((g, i) => lines.push([`${i + 1} 0 0 0`, g.dna.join(' '), statStr(g.score), statStr(g.level), ''].join('|')));
  return { text: lines.join('\n') + '\n', genotypes: sel.length, uniqueDna: byDna.size, meanScore: Math.max(0, meanScore(aggS)), maxLevel: aggL.max, maxScore: aggS.max, baseMaxScore: base ? base.gScore.max : 0, baseMaxLevel: base ? base.gLevel.max : 0, baseMeanScore: base ? Math.max(0, meanScore(base.gScore)) : 0, trials: Math.max(trialno, sel.length) };
}

// ---- chromium + vite --------------------------------------------------------
// Locate a cached Playwright Chromium without hard-coding the build number (it
// bumps on every playwright-core update). Prefer $CHROMIUM_EXE, else the newest
// cached headless-shell, else the newest full Chromium.
function findChromium() {
  if (process.env.CHROMIUM_EXE && existsSync(process.env.CHROMIUM_EXE)) return process.env.CHROMIUM_EXE;
  const cache = `${homedir()}/Library/Caches/ms-playwright`;
  let dirs;
  try { dirs = readdirSync(cache); } catch { return null; }
  const rels = {
    'chromium_headless_shell-': ['chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell'],
    'chromium-': ['chrome-mac/Chromium.app/Contents/MacOS/Chromium'],
  };
  for (const prefix of ['chromium_headless_shell-', 'chromium-']) {
    const newest = dirs.filter((d) => d.startsWith(prefix))
      .sort((a, b) => (parseInt(b.slice(prefix.length), 10) || 0) - (parseInt(a.slice(prefix.length), 10) || 0));
    for (const dir of newest) for (const rel of rels[prefix]) {
      const p = `${cache}/${dir}/${rel}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}
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
