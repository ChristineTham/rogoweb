import { describe, it, expect } from 'vitest';
import {
  calculateFontSize,
  calculateTerminalFit,
  calculateTerminalViewport,
  FALLBACK_CELL_SCALE,
  VIEWPORT_BORDER_PX,
} from './scaling';

describe('Terminal Scaling Utilities', () => {
  it('calculates font size constrained by width', () => {
    const fontSize = calculateFontSize(800, 600, FALLBACK_CELL_SCALE, 80, 24);
    // usableW = 796, usableH = 596
    // maxByWidth = 796 / 48 = 16.58
    // maxByHeight = 596 / 28.8 = 20.69
    // Math.floor(Math.min(16.58, 20.69)) = 16
    expect(fontSize).toBe(16);
  });

  it('calculates font size constrained by height', () => {
    const fontSize = calculateFontSize(1200, 400, FALLBACK_CELL_SCALE, 80, 24);
    // usableW = 1196, usableH = 396
    // maxByWidth = 1196 / 48 = 24.9
    // maxByHeight = 396 / 28.8 = 13.75
    // Math.floor(Math.min(24.9, 13.75)) = 13
    expect(fontSize).toBe(13);
  });

  it('computes correct viewport size including border', () => {
    const viewport = calculateTerminalViewport(15, FALLBACK_CELL_SCALE, 80, 24);
    // width = Math.round(15 * 80 * 0.6) + 4 = 724
    // height = Math.round(15 * 24 * 1.2) + 4 = 436
    expect(viewport).toEqual({
      width: 724,
      height: 436,
    });
  });

  it('combines calculation of font size and viewport size', () => {
    const fit = calculateTerminalFit(1000, 500, FALLBACK_CELL_SCALE, 80, 24);
    // usableW = 996, usableH = 496
    // maxW = 996 / 48 = 20.75
    // maxH = 496 / 28.8 = 17.22
    // fontSize = 17
    // width = Math.round(17 * 80 * 0.6) + 4 = 820
    // height = Math.round(17 * 24 * 1.2) + 4 = 494
    expect(fit).toEqual({
      fontSize: 17,
      width: 820,
      height: 494,
    });
  });
});
