import { describe, it, expect } from 'vitest';
import {
  calculateFontSize,
  calculateTerminalViewport,
  calculateTerminalFit,
  FALLBACK_CELL_SCALE,
} from './scaling';

describe('Terminal Scaling Utilities', () => {
  const customCellScale = { width: 0.5, height: 1.0 };
  const cols = 80;
  const rows = 24;

  describe('calculateFontSize', () => {
    it('calculates font size constrained by width', () => {
      // Usable width: 800 - 4 = 796. Max font size by width: 796 / (80 * 0.6) = 16.58.
      // Usable height: 600 - 4 = 596. Max font size by height: 596 / (24 * 1.2) = 20.69.
      // Expected font size is floor(min(16.58, 20.69)) = 16.
      const size = calculateFontSize(800, 600, FALLBACK_CELL_SCALE, cols, rows);
      expect(size).toBe(16);
    });

    it('calculates font size constrained by height', () => {
      // Usable width: 1200 - 4 = 1196. Max font size by width: 1196 / (80 * 0.6) = 24.91.
      // Usable height: 400 - 4 = 396. Max font size by height: 396 / (24 * 1.2) = 13.75.
      // Expected font size is floor(min(24.91, 13.75)) = 13.
      const size = calculateFontSize(1200, 400, FALLBACK_CELL_SCALE, cols, rows);
      expect(size).toBe(13);
    });

    it('enforces a minimum font size of 1 even if container is too small', () => {
      const size = calculateFontSize(10, 10, FALLBACK_CELL_SCALE, cols, rows);
      expect(size).toBe(1);
    });

    it('applies custom border pixel padding', () => {
      // Usable width: 800 - 20 = 780. Max font size by width: 780 / (80 * 0.6) = 16.25.
      // Usable height: 600 - 20 = 580. Max font size by height: 580 / (24 * 1.2) = 20.13.
      // Expected font size is floor(min(16.25, 20.13)) = 16.
      const size = calculateFontSize(800, 600, FALLBACK_CELL_SCALE, cols, rows, 20);
      expect(size).toBe(16);
    });

    it('uses custom cell scales', () => {
      // Usable width: 800 - 4 = 796. Max font size by width: 796 / (80 * 0.5) = 19.9.
      // Usable height: 600 - 4 = 596. Max font size by height: 596 / (24 * 1.0) = 24.83.
      // Expected font size is floor(min(19.9, 24.83)) = 19.
      const size = calculateFontSize(800, 600, customCellScale, cols, rows);
      expect(size).toBe(19);
    });
  });

  describe('calculateTerminalViewport', () => {
    it('computes correct dimensions including default border size', () => {
      // FontSize: 15. Width: round(15 * 80 * 0.6) + 4 = 724.
      // Height: round(15 * 24 * 1.2) + 4 = 436.
      const viewport = calculateTerminalViewport(15, FALLBACK_CELL_SCALE, cols, rows);
      expect(viewport).toEqual({
        width: 724,
        height: 436,
      });
    });

    it('computes correct dimensions with custom border size', () => {
      // FontSize: 15. Width: round(15 * 80 * 0.6) + 10 = 730.
      // Height: round(15 * 24 * 1.2) + 10 = 442.
      const viewport = calculateTerminalViewport(15, FALLBACK_CELL_SCALE, cols, rows, 10);
      expect(viewport).toEqual({
        width: 730,
        height: 442,
      });
    });

    it('computes correct dimensions with custom cell scale', () => {
      // FontSize: 16. Width: round(16 * 80 * 0.5) + 4 = 644.
      // Height: round(16 * 24 * 1.0) + 4 = 388.
      const viewport = calculateTerminalViewport(16, customCellScale, cols, rows);
      expect(viewport).toEqual({
        width: 644,
        height: 388,
      });
    });
  });

  describe('calculateTerminalFit', () => {
    it('correctly fits terminal details together in a single structure', () => {
      // Usable width: 1000 - 4 = 996. Max font size by width: 996 / (80 * 0.6) = 20.75.
      // Usable height: 500 - 4 = 496. Max font size by height: 496 / (24 * 1.2) = 17.22.
      // FontSize = 17.
      // Width = round(17 * 80 * 0.6) + 4 = 820.
      // Height = round(17 * 24 * 1.2) + 4 = 494.
      const fit = calculateTerminalFit(1000, 500, FALLBACK_CELL_SCALE, cols, rows);
      expect(fit).toEqual({
        fontSize: 17,
        width: 820,
        height: 494,
      });
    });
  });
});
