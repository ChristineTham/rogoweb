import { describe, it, expect } from 'vitest';
import { parseStat, statStr, meanScore, parsePool, mergeStat, mergePools } from './genepool.mjs';

// --- fixtures ---------------------------------------------------------------
const stat = (c: number, s: number, sq: number, mn: number, mx: number) => `${c} ${s} ${sq} ${mn} ${mx}`;
const dna = (n: number) => Array(8).fill(n).join(' ');
const gene = (id: number, d: string, score: string, level: string) => `${id} 0 0 0|${d}|${score}|${level}|`;
const pool = (header: string, gScore: string, gLevel: string, genes: string[]) =>
  [`${header}|${gScore}|${gLevel}|`, ...genes].join('\n') + '\n';

// A shipped base pool: 2 genotypes, 10 trials, peak score 90, peak level 4.
const base = pool('1000 10 2 0 0 0', stat(10, 500, 30000, 20, 90), stat(10, 25, 75, 1, 4), [
  gene(1, dna(1), stat(6, 300, 18000, 20, 80), stat(6, 15, 45, 1, 3)),
  gene(2, dna(2), stat(4, 200, 12000, 30, 90), stat(4, 10, 30, 2, 4)),
]);

// Two islands that both RESUMED from `base` and played more games. Their global
// peaks (85 / 88) are *below* the base's 90 on purpose, to exercise the ratchet.
const islandA = pool('1000 15 3 0 0 0', stat(15, 720, 42000, 20, 85), stat(15, 36, 100, 1, 4), [
  gene(1, dna(1), stat(9, 470, 26000, 20, 85), stat(9, 23, 68, 1, 4)), // base 6 → 9 games
  gene(2, dna(2), stat(4, 200, 12000, 30, 90), stat(4, 10, 30, 2, 4)), // unchanged
  gene(3, dna(3), stat(2, 50, 1300, 20, 30), stat(2, 3, 5, 1, 2)), // NEW, weak
]);
const islandB = pool('1000 13 2 0 0 0', stat(13, 650, 40000, 25, 88), stat(13, 32, 95, 1, 4), [
  gene(1, dna(1), stat(7, 360, 20000, 20, 82), stat(7, 18, 52, 1, 3)), // base 6 → 7 games
  gene(2, dna(2), stat(4, 200, 12000, 30, 90), stat(4, 10, 30, 2, 4)), // unchanged
]);

describe('parseStat / statStr / meanScore', () => {
  it('round-trips a stat quintuple', () => {
    const s = parseStat('6 300 18000 20 80');
    expect(s).toEqual({ count: 6, sum: 300, sumsq: 18000, min: 20, max: 80 });
    expect(statStr(s)).toBe('6 300 18000 20 80');
  });
  it('defaults missing fields to 0', () => {
    expect(parseStat('')).toEqual({ count: 0, sum: 0, sumsq: 0, min: 0, max: 0 });
  });
  it('computes the mean, or -1 with no samples', () => {
    expect(meanScore({ count: 4, sum: 200, sumsq: 0, min: 0, max: 0 })).toBe(50);
    expect(meanScore({ count: 0, sum: 0, sumsq: 0, min: 0, max: 0 })).toBe(-1);
  });
});

describe('parsePool', () => {
  it('parses the header globals and genotypes', () => {
    const p = parsePool(base)!;
    expect(p.trialno).toBe(10);
    expect(p.gScore).toEqual({ count: 10, sum: 500, sumsq: 30000, min: 20, max: 90 });
    expect(p.genes).toHaveLength(2);
    expect(p.genes[0].dna).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(p.genes[0].score.sum).toBe(300);
  });
  it('returns null for empty text and skips malformed genotype lines', () => {
    expect(parsePool('')).toBeNull();
    expect(parsePool('   \n  \n')).toBeNull();
    // A gene line with <8 dna values is dropped, not crashed on.
    const bad = pool('1 1 1 0 0 0', stat(1, 1, 1, 1, 1), stat(1, 1, 1, 1, 1), ['1 0 0 0|1 2 3|1 1 1 1 1|1 1 1 1 1|']);
    expect(parsePool(bad)!.genes).toHaveLength(0);
  });
});

describe('mergeStat', () => {
  it('sums additive fields and takes extremes when there is no base', () => {
    const m = mergeStat(null, [
      { count: 3, sum: 30, sumsq: 300, min: 5, max: 15 },
      { count: 2, sum: 24, sumsq: 290, min: 8, max: 16 },
    ]);
    expect(m).toEqual({ count: 5, sum: 54, sumsq: 590, min: 5, max: 16 });
  });

  it('subtracts the shared base so its games are counted once, not per island', () => {
    const b = { count: 2, sum: 20, sumsq: 200, min: 5, max: 12 };
    // Both island stats already INCLUDE the base's 2 games.
    const m = mergeStat(b, [
      { count: 5, sum: 50, sumsq: 520, min: 4, max: 14 }, // +3 new games
      { count: 4, sum: 44, sumsq: 500, min: 6, max: 16 }, // +2 new games
    ]);
    // count = 2 + 3 + 2 = 7 (NOT 2+5+4=11 — base would be triple-counted)
    expect(m).toEqual({ count: 7, sum: 74, sumsq: 820, min: 4, max: 16 });
  });

  it('is idempotent when an island added no new games over the base', () => {
    const b = { count: 2, sum: 20, sumsq: 200, min: 5, max: 12 };
    expect(mergeStat(b, [{ ...b }])).toEqual(b);
  });
});

describe('mergePools — resume (no-regression + ratchet)', () => {
  const merged = mergePools([islandA, islandB], base, 20)!;

  it('keeps the pool at the base size (never grows or shrinks)', () => {
    expect(merged.genotypes).toBe(2);
    expect(parsePool(merged.text)!.genes).toHaveLength(2);
  });

  it('drops the weak new genotype and keeps the two proven ones (elitism)', () => {
    const dnas = parsePool(merged.text)!.genes.map((g) => g.dna[0]);
    expect(dnas).toEqual([1, 2]); // dna(3) evicted
  });

  it('pools each genotype across islands with the base counted once', () => {
    const g1 = parsePool(merged.text)!.genes[0].score;
    // g1: base 6 games → island A 9, island B 7 ⇒ 6 + 3 + 1 = 10 games; 300 + 170 + 60 = 530.
    expect(g1.count).toBe(10);
    expect(g1.sum).toBe(530);
  });

  it('ratchets the peak — never drops below the base even when islands peaked lower', () => {
    expect(merged.maxScore).toBe(90); // islands peaked 85 / 88; base 90 holds
    expect(merged.baseMaxScore).toBe(90);
    expect(merged.maxLevel).toBe(4);
  });

  it('carries global trials as base + each island’s NEW games', () => {
    expect(merged.trials).toBe(18); // 10 + (15-10) + (13-10)
  });

  it('reports the base mean so the driver can gate the write (ratchet)', () => {
    expect(merged.baseMeanScore).toBe(50); // 500 / 10
  });

  it('emits a pool that re-parses cleanly', () => {
    const reparsed = parsePool(merged.text)!;
    expect(reparsed).not.toBeNull();
    expect(reparsed.trialno).toBe(18);
    expect(reparsed.genes.every((g) => g.dna.length === 8)).toBe(true);
  });
});

describe('mergePools — reset (fresh pool, no base)', () => {
  const merged = mergePools([islandA, islandB], null, 2)!;

  it('sizes to the requested target', () => {
    expect(merged.genotypes).toBe(2);
  });
  it('takes the true island peak with no ratchet floor', () => {
    expect(merged.maxScore).toBe(88); // max(85, 88), no base to floor against
    expect(merged.baseMaxScore).toBe(0);
  });
  it('sums island trials (no base to subtract)', () => {
    expect(merged.trials).toBe(28); // 15 + 13
  });
});

describe('mergePools — degenerate input', () => {
  it('returns null when there are no valid islands', () => {
    expect(mergePools([], null, 2)).toBeNull();
    expect(mergePools([''], null, 2)).toBeNull();
  });
});
