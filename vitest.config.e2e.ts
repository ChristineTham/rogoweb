import { defineConfig } from 'vitest/config';

// End-to-end suite: each file boots a real Vite dev server (COOP/COEP for
// SharedArrayBuffer) and a headless Chromium, then drives the actual app. Kept
// out of the default `vitest run` (which only globs *.spec.ts) because a game
// takes tens of seconds. Runs single-forked and serially — one dev server /
// browser at a time.
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.ts'],
    testTimeout: 180_000,
    hookTimeout: 120_000,
    fileParallelism: false, // one dev server / browser at a time
  },
});
