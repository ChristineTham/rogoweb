/*
 * Pure telemetry / observer-log helpers, extracted from main.ts so the
 * play-by-play logic added in v1.0.0 can be unit-tested in isolation. These
 * functions never touch the DOM — callers do the element writes — which keeps
 * them deterministic and side-effect free.
 */

export const REPO_URL = 'https://github.com/ChristineTham/rogoweb';

/** Parse an "N(M)" readout (HP / strength), e.g. "15(20)" → { cur: 15, max: 20 }. */
export function parseStatPair(s: string): { cur: number; max: number } | null {
  const m = s.match(/(\d+)\((\d+)\)/);
  if (!m) return null;
  return { cur: parseInt(m[1], 10), max: parseInt(m[2], 10) };
}

/** Tailwind class for a 0–100% bar: red < 30, amber < 70, else green. */
export function barColorClass(pct: number): string {
  return pct < 30 ? 'bg-red-600' : pct < 70 ? 'bg-amber-500' : 'bg-green-600';
}

/** Gene-pool size from a worker log line ("Gene pool size N, started …"), or null. */
export function parseGenePoolSize(message: unknown): number | null {
  const m = String(message).match(/Gene pool size (\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Descent-milestone message, or null. Only fires on an actual descent
 * (newLevel > prevLevel) and never on the first level reached (prevLevel 0),
 * so entering level 1 at game start is silent.
 */
export function descentMessage(prevLevel: number, newLevel: number): string | null {
  if (prevLevel > 0 && newLevel > prevLevel) return `⬇ Descended to dungeon level ${newLevel}`;
  return null;
}

/**
 * Latched low-HP crisis state machine: warn once when HP drops below 25%,
 * and re-arm only after it recovers above 50% (avoids log spam while wounded).
 * Returns the next latched state and the message to log (or null).
 */
export function hpCrisisTransition(
  hp: number,
  maxhp: number,
  latched: boolean,
): { latched: boolean; message: string | null } {
  if (maxhp <= 0) return { latched, message: null };
  const pct = (hp / maxhp) * 100;
  if (pct < 25 && !latched) return { latched: true, message: `⚠ Critical HP ${hp}/${maxhp} — the bot is in danger` };
  if (pct > 50) return { latched: false, message: null };
  return { latched, message: null };
}

/** Game-over summary line for the observer log. */
export function gameOverSummary(
  depth: string | number,
  gold: string | number,
  turns: string | number,
): string {
  return `☠ Game over — reached level ${depth}, ${gold} gold, ${turns} turns`;
}

/** New-game banner (shows the running version + build) for the observer log. */
export function newGameBanner(version: string, commit: string): string {
  return `[system] rogoweb v${version} (${commit}) — new game`;
}

/** Footer version label, e.g. "v1.0.0". */
export function versionLabel(version: string): string {
  return `v${version}`;
}

/** GitHub commit URL for the footer link, or null for an unknown/empty build. */
export function commitUrl(commit: string): string | null {
  return commit && commit !== 'unknown' ? `${REPO_URL}/commit/${commit}` : null;
}
