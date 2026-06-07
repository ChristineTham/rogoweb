import { describe, it, expect } from 'vitest';

/**
 * ADAPTIVE LAYOUT LOGIC FOR TESTING
 */
const determineLayout = (containerW: number, containerH: number, targetW: number, targetH: number) => {
  const MIN_STATS_W = 140;
  const MIN_STATS_H = 110;

  if (containerW >= targetW + MIN_STATS_W + 5) {
    return 'WIDE';
  } else if (containerH >= targetH + MIN_STATS_H + 10) {
    return 'TALL';
  } else {
    return 'COMPACT';
  }
};

describe('Adaptive Layout Engine', () => {
  it('chooses WIDE layout when horizontal space accommodates stats panel', () => {
    // target width = 640. MIN_STATS_W + 5 = 145. WIDE if containerW >= 785
    const layout = determineLayout(800, 500, 640, 480);
    expect(layout).toBe('WIDE');
  });

  it('chooses TALL layout when vertical space accommodates stats panel but horizontal does not', () => {
    // target width = 640, height = 480. MIN_STATS_H + 10 = 120. TALL if containerH >= 600
    const layout = determineLayout(700, 650, 640, 480);
    expect(layout).toBe('TALL');
  });

  it('chooses COMPACT layout and hides stats when space is restricted', () => {
    const layout = determineLayout(700, 500, 640, 480);
    expect(layout).toBe('COMPACT');
  });
});
