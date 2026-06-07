import { describe, it, expect } from 'vitest';
import {
  calculateFontSize,
  calculateTerminalFit,
  calculateTerminalViewport,
  FALLBACK_CELL_SCALE,
  VIEWPORT_BORDER_PX,
} from './scaling';

describe('Terminal Scaling', () => {
  it('should choose the height-limited font size when width has spare room', () => {
    const fontSize = calculateFontSize(1440, 880, FALLBACK_CELL_SCALE, 80, 24);

    expect(fontSize).toBe(29);
  });

  it('should choose the width-limited font size when the viewport is narrow', () => {
    const fontSize = calculateFontSize(900, 880, FALLBACK_CELL_SCALE, 80, 24);

    expect(fontSize).toBe(18);
  });

  it('should include the viewport border in the final terminal box', () => {
    const viewport = calculateTerminalViewport(20, FALLBACK_CELL_SCALE, 80, 24);

    expect(viewport).toEqual({
      width: Math.round(20 * 80 * FALLBACK_CELL_SCALE.width) + VIEWPORT_BORDER_PX,
      height: Math.round(20 * 24 * FALLBACK_CELL_SCALE.height) + VIEWPORT_BORDER_PX,
    });
  });

  it('should return the max-fit font size and viewport together', () => {
    const fit = calculateTerminalFit(900, 880, FALLBACK_CELL_SCALE, 80, 24);

    expect(fit).toEqual({
      fontSize: 18,
      width: Math.round(18 * 80 * FALLBACK_CELL_SCALE.width) + VIEWPORT_BORDER_PX,
      height: Math.round(18 * 24 * FALLBACK_CELL_SCALE.height) + VIEWPORT_BORDER_PX,
    });
  });
});
