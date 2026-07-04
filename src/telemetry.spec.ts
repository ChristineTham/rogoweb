import { describe, it, expect } from 'vitest';
import {
  parseStatPair,
  barColorClass,
  parseGenePoolSize,
  descentMessage,
  hpCrisisTransition,
  gameOverSummary,
  newGameBanner,
  versionLabel,
  commitUrl,
  REPO_URL,
} from './telemetry';

describe('parseStatPair', () => {
  it('parses "cur(max)" readouts', () => {
    expect(parseStatPair('15(20)')).toEqual({ cur: 15, max: 20 });
    expect(parseStatPair('11(16)')).toEqual({ cur: 11, max: 16 });
  });
  it('finds the pair embedded in a longer string', () => {
    expect(parseStatPair('Hp: 35(52)')).toEqual({ cur: 35, max: 52 });
  });
  it('returns null when there is no pair', () => {
    expect(parseStatPair('18')).toBeNull();
    expect(parseStatPair('')).toBeNull();
    expect(parseStatPair('18/00')).toBeNull();
  });
});

describe('barColorClass', () => {
  it('is red below 30%', () => {
    expect(barColorClass(0)).toBe('bg-red-600');
    expect(barColorClass(29.9)).toBe('bg-red-600');
  });
  it('is amber from 30% up to but not including 70%', () => {
    expect(barColorClass(30)).toBe('bg-amber-500');
    expect(barColorClass(69.9)).toBe('bg-amber-500');
  });
  it('is green from 70% up', () => {
    expect(barColorClass(70)).toBe('bg-green-600');
    expect(barColorClass(100)).toBe('bg-green-600');
  });
});

describe('parseGenePoolSize', () => {
  it('extracts the size from the worker log line', () => {
    expect(parseGenePoolSize('Gene pool size 20, started Fri Jul 3 18:18:09 2026')).toBe(20);
    expect(parseGenePoolSize('Gene pool size 7')).toBe(7);
  });
  it('returns null for unrelated messages', () => {
    expect(parseGenePoolSize('Trials 162, births 38')).toBeNull();
    expect(parseGenePoolSize('')).toBeNull();
  });
  it('coerces non-string input', () => {
    expect(parseGenePoolSize(undefined)).toBeNull();
    expect(parseGenePoolSize(12345)).toBeNull();
  });
});

describe('descentMessage', () => {
  it('is silent on the first level reached (prev 0)', () => {
    expect(descentMessage(0, 1)).toBeNull();
    expect(descentMessage(0, 5)).toBeNull();
  });
  it('reports a genuine descent', () => {
    expect(descentMessage(1, 2)).toBe('⬇ Descended to dungeon level 2');
    expect(descentMessage(4, 5)).toBe('⬇ Descended to dungeon level 5');
  });
  it('is silent when the level does not increase', () => {
    expect(descentMessage(3, 3)).toBeNull();
    expect(descentMessage(3, 2)).toBeNull();
  });
});

describe('hpCrisisTransition', () => {
  it('warns once when HP drops below 25% and latches', () => {
    const r = hpCrisisTransition(2, 15, false);
    expect(r.latched).toBe(true);
    expect(r.message).toBe('⚠ Critical HP 2/15 — the bot is in danger');
  });
  it('does not warn again while still latched and low', () => {
    const r = hpCrisisTransition(3, 15, true);
    expect(r.latched).toBe(true);
    expect(r.message).toBeNull();
  });
  it('holds the latch in the hysteresis band (25–50%)', () => {
    // 40% — neither re-arms nor clears; latch unchanged, no message.
    expect(hpCrisisTransition(6, 15, true)).toEqual({ latched: true, message: null });
    expect(hpCrisisTransition(6, 15, false)).toEqual({ latched: false, message: null });
  });
  it('re-arms only after recovering above 50%', () => {
    const r = hpCrisisTransition(9, 15, true);
    expect(r.latched).toBe(false);
    expect(r.message).toBeNull();
  });
  it('is a no-op when maxhp is unknown', () => {
    expect(hpCrisisTransition(0, 0, false)).toEqual({ latched: false, message: null });
    expect(hpCrisisTransition(0, 0, true)).toEqual({ latched: true, message: null });
  });
  it('does not re-fire without recovery (full crisis cycle)', () => {
    // maxhp 20 → crisis below 5 HP (25%), re-arm above 10 HP (50%).
    let latched = false;
    const seq = [20, 4, 3, 8, 12, 4]; // ok, dip, hold-low, hold-band, recover, dip again
    const fired: number[] = [];
    seq.forEach((hp, i) => {
      const r = hpCrisisTransition(hp, 20, latched);
      latched = r.latched;
      if (r.message) fired.push(i);
    });
    // Fires at index 1 (first <25%) and again at index 5 (after recovering >50% at index 4).
    expect(fired).toEqual([1, 5]);
  });
});

describe('gameOverSummary', () => {
  it('formats the end-of-game line', () => {
    expect(gameOverSummary(8, 1786, 2782)).toBe('☠ Game over — reached level 8, 1786 gold, 2782 turns');
  });
  it('accepts string readouts straight from the DOM', () => {
    expect(gameOverSummary('5', '508', '1138')).toBe('☠ Game over — reached level 5, 508 gold, 1138 turns');
  });
});

describe('newGameBanner', () => {
  it('embeds version and commit', () => {
    expect(newGameBanner('1.0.0', '136d03f')).toBe('[system] rogoweb v1.0.0 (136d03f) — new game');
  });
});

describe('versionLabel', () => {
  it('prefixes with v', () => {
    expect(versionLabel('1.0.0')).toBe('v1.0.0');
  });
});

describe('commitUrl', () => {
  it('builds a GitHub commit URL', () => {
    expect(commitUrl('136d03f')).toBe(`${REPO_URL}/commit/136d03f`);
  });
  it('returns null for an unknown or empty build', () => {
    expect(commitUrl('unknown')).toBeNull();
    expect(commitUrl('')).toBeNull();
  });
});
