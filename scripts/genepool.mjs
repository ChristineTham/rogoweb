/*
 * Pure gene-pool parse/merge logic for the island-model pretraining driver,
 * extracted from pretrain.mjs so the correctness-critical merge invariants
 * (base-subtract, evidence-weighted elitism, no-regression / ratchet) can be
 * unit-tested. No I/O here — callers read/write the files.
 *
 * Pool format: "<inittime> <trial> <lastid> <cross> <shift> <mut>|<score>|<level>|"
 * then one line per genotype: "<id> <creat> <fa> <mo>|<dna x8>|<score>|<level>|"
 * stat = "count sum sumsq min max". father/mother are logging-only (learn.c).
 */

export const parseStat = (s) => {
  const [c, su, sq, mn, mx] = (s || '').trim().split(/\s+/).map(Number);
  return { count: c || 0, sum: su || 0, sumsq: sq || 0, min: mn || 0, max: mx || 0 };
};

export const statStr = (s) => `${s.count} ${s.sum} ${s.sumsq} ${s.min} ${s.max}`;

export const meanScore = (s) => (s.count ? s.sum / s.count : -1);

export function parsePool(text) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
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
export function mergeStat(base, islandStats) {
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

export function mergePools(islandTexts, baseText, targetSize) {
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
