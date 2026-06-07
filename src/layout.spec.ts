import { describe, it, expect } from 'vitest';

/**
 * MOCK ADAPTIVE LAYOUT LOGIC
 */
const determineLayout = (containerW: number, containerH: number, targetW: number, targetH: number) => {
  const MIN_STATS_W = 180;
  const MIN_STATS_H = 120;

  if (containerW >= targetW + MIN_STATS_W + 20) {
    return 'WIDE';
  } else if (containerH >= targetH + MIN_STATS_H + 20) {
    return 'TALL';
  } else {
    return 'COMPACT';
  }
};

describe('Adaptive Stats Panel Layout', () => {
  it('should use WIDE layout when horizontal space is available', () => {
    const layout = determineLayout(1000, 500, 800, 480);
    expect(layout).toBe('WIDE');
  });

  it('should use TALL layout when vertical space is available but horizontal is not', () => {
    const layout = determineLayout(800, 800, 800, 480);
    expect(layout).toBe('TALL');
  });

  it('should use COMPACT layout when space is constrained', () => {
    const layout = determineLayout(810, 490, 800, 480);
    expect(layout).toBe('COMPACT');
  });
});
