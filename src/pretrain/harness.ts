/*
 * Headless gene-pool pretraining harness (no UI).
 *
 * Spawns the same rogue + rogomatic web workers the app uses, plays games
 * back-to-back, and lets the gene pool accumulate in IDBFS (IndexedDB) exactly
 * as it would in a normal browser session. Progress, the parsed pool stats, and
 * the captured worker log stream are published on `window.__pretrain` for the
 * Playwright driver (scripts/pretrain.mjs) to poll and extract.
 *
 * Query params (set by the driver): runs, until, seed, base, timeout, fresh.
 */
import { SharedIPC } from '../ipc/ring-buffer';

interface PoolStats {
  trialno: number;
  births: number;
  genotypes: number;
  meanScore: number;
  meanLevel: number;
  highScore: number;
  highLevel: number;
}

interface PretrainState {
  gamesDone: number;
  maxRuns: number;
  done: boolean;
  crossOriginIsolated: boolean;
  log: string[];
  lastStatus: number | null;
  poolStats: PoolStats | null;
  error?: string;
}

const GENE_DB = '/var/games/rogomatic';
const GENE_POOL = '/var/games/rogomatic/GenePool544';

const params = new URLSearchParams(location.search);
// Default 100: ~5x the 20-genotype pool — enough to evaluate every initial
// genotype (pickgenotype tests all before breeding) and breed the first evolved
// generation. The GA is lifetime-learning (untested() threshold grows with
// total trials), so more helps with diminishing returns; 100 is the practical knee.
const maxRuns = Math.max(1, parseInt(params.get('runs') || '100', 10));
// Default 45s: long enough for a natural death through ~level 2-3 (which is
// what records fitness), short enough to cap a genotype stuck searching a level.
// Too short guillotines good games before endlesson records them; too long
// wastes wall-clock on stuck genotypes (which time out without recording).
const gameTimeoutMs = Math.max(5000, parseInt(params.get('timeout') || '45000', 10));
const untilExpr = params.get('until') || '';
const seedMode = params.get('seed') || 'random';
// Resume by default: seed the first game from the bundled pretrained pool and
// keep evolving it (no wipe), so every run builds on the shipped pool. Pass
// --reset to wipe IndexedDB and start a fresh random pool instead.
const reset = params.get('reset') === '1';

const state: PretrainState = {
  gamesDone: 0,
  maxRuns,
  done: false,
  crossOriginIsolated: self.crossOriginIsolated === true,
  log: [],
  lastStatus: null,
  poolStats: null,
};
(window as any).__pretrain = state;

const statusEl = document.getElementById('status');
const setStatus = (s: string) => { if (statusEl) statusEl.textContent = s; };

// Deterministic seed generator when a base seed is given, else random per game.
let seedState = parseInt(params.get('base') || '', 10) || 0;
const nextSeed = (): string => {
  if (seedMode !== 'random' && seedState) {
    seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
    return String((seedState % 900000) + 100000);
  }
  return String(Math.floor(Math.random() * 900000) + 100000);
};

function deleteGeneDb(): Promise<void> {
  return new Promise((res) => {
    const r = indexedDB.deleteDatabase(GENE_DB);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

/* Play a single game: spawn both workers, wire the shared ring buffer, resolve
   when either worker exits (game over). Terminates both and returns the status. */
function playOneGame(seed: string): Promise<number> {
  return new Promise((resolve) => {
    const sab = SharedIPC.createSAB();
    const rogue = new Worker(new URL('../rogue-worker.ts', import.meta.url));
    const rogo = new Worker(new URL('../rogomatic-worker.ts', import.meta.url));
    let settled = false;
    let timer = 0;
    let graceTimer = 0;
    let lastStatus = 0;

    const finish = (status: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(graceTimer);
      try { rogue.terminate(); } catch { /* ignore */ }
      try { rogo.terminate(); } catch { /* ignore */ }
      resolve(status);
    };

    const onMsg = (e: MessageEvent) => {
      const d = (e.data || {}) as any;
      if (d.type === 'log') {
        // Worker log channel carries C stderr (incl. our PRETRAIN debug markers).
        state.log.push(`[${d.source}] ${String(d.message).replace(/\s+$/, '')}`);
      } else if (d.type === 'stdout') {
        // Capture only rogomatic's own status lines (endlesson save/sync
        // markers), not the whole VT100 stream.
        const t = String(d.message);
        if (/Rogomatic:|triggering sync|LTM saved|Genes written|perditus/.test(t)) {
          state.log.push(`[${d.source}:out] ${t.replace(/\s+$/, '')}`);
        }
      } else if (d.type === 'exit') {
        lastStatus = typeof d.status === 'number' ? d.status : 0;
        // Rogomatic runs endlesson (writes + syncs the pool) then exits, so its
        // exit means the pool is persisted -> finish now. Rogue usually exits
        // first (and rogomatic then blocks reading the gone pipe), so on a
        // rogue-only exit give rogomatic a grace window to finish endlesson.
        if (d.source === 'rogomatic') finish(lastStatus);
        else if (!graceTimer) graceTimer = self.setTimeout(() => finish(lastStatus), 4000);
      } else if (d.type === 'fs_error') {
        state.log.push(`[fs_error] ${d.message}`);
      }
    };

    rogue.onmessage = onMsg;
    rogo.onmessage = onMsg;
    rogue.onerror = (e) => state.log.push(`[rogue.error] ${e.message}`);
    rogo.onerror = (e) => state.log.push(`[rogomatic.error] ${e.message}`);

    timer = self.setTimeout(() => {
      state.log.push(`[harness] game ${state.gamesDone + 1} timed out after ${gameTimeoutMs}ms`);
      finish(-99);
    }, gameTimeoutMs);

    // Seed from the bundled pool by default (resume); --reset skips seeding so
    // the C learner builds a fresh random pool.
    rogue.postMessage({ type: 'init', sab, userName: 'Trainer', seed, skipPretrain: reset });
    rogo.postMessage({ type: 'init', sab, userName: 'Trainer', seed, skipPretrain: reset });
  });
}

/* Read + parse the evolving gene pool straight from the IDBFS IndexedDB. */
async function readPoolStats(): Promise<PoolStats | null> {
  try {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open(GENE_DB);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (!Array.from(db.objectStoreNames).includes('FILE_DATA')) { db.close(); return null; }
    const rec: any = await new Promise((res) => {
      const t = db.transaction('FILE_DATA', 'readonly').objectStore('FILE_DATA').get(GENE_POOL);
      t.onsuccess = () => res(t.result);
      t.onerror = () => res(null);
    });
    db.close();
    if (!rec || !rec.contents) return null;
    const text = new TextDecoder().decode(rec.contents as Uint8Array);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 1) return null;
    const header = lines[0].split('|');
    const hnums = header[0].trim().split(/\s+/).map(Number);
    const parseStat = (s: string) => {
      const [count, sum, , , high] = (s || '').trim().split(/\s+/).map(Number);
      return { mean: count ? sum / count : 0, high: high || 0 };
    };
    const score = parseStat(header[1]);
    const level = parseStat(header[2]);
    return {
      trialno: hnums[1] || 0,
      births: hnums[2] || 0,
      genotypes: lines.length - 1,
      meanScore: score.mean,
      meanLevel: level.mean,
      highScore: score.high,
      highLevel: level.high,
    };
  } catch {
    return null;
  }
}

function goalMet(stats: PoolStats | null): boolean {
  if (!untilExpr || !stats) return false;
  const m = untilExpr.match(/^(\w+)\s*(>=|>|=)\s*([\d.]+)$/);
  if (!m) return false;
  const cur = (stats as any)[m[1]];
  const val = parseFloat(m[3]);
  return typeof cur === 'number' && (m[2] === '>' ? cur > val : cur >= val);
}

async function train() {
  if (!state.crossOriginIsolated) {
    state.error = 'crossOriginIsolated is false — SharedArrayBuffer unavailable (missing COOP/COEP headers)';
    state.done = true;
    setStatus(state.error);
    return;
  }
  if (reset) {
    await deleteGeneDb();
    state.log.push('[harness] --reset: wiped the gene pool, starting from a fresh random pool');
  }

  for (let i = 0; i < maxRuns; i++) {
    setStatus(`playing game ${i + 1}/${maxRuns}…`);
    const status = await playOneGame(nextSeed());
    state.gamesDone = i + 1;
    state.lastStatus = status;
    state.poolStats = await readPoolStats();
    const s = state.poolStats;
    setStatus(
      `game ${state.gamesDone}/${maxRuns}  ` +
      (s ? `trials=${s.trialno} meanLvl=${s.meanLevel.toFixed(2)} meanScore=${s.meanScore.toFixed(0)} hiScore=${s.highScore}` : '(no pool)')
    );
    if (goalMet(state.poolStats)) {
      state.log.push(`[harness] goal met (${untilExpr}) after ${state.gamesDone} games`);
      break;
    }
  }

  state.done = true;
  state.log.push(`[harness] training complete: ${state.gamesDone} games`);
  setStatus(`DONE — ${state.gamesDone} games`);
}

train().catch((e) => {
  state.error = String(e && e.stack ? e.stack : e);
  state.done = true;
  setStatus(`ERROR: ${state.error}`);
});
