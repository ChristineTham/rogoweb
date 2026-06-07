import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 1: Environment', () => {
  it('should have VT323 font file', () => {
    const fontPath = join(process.cwd(), 'rogoweb', 'public', 'fonts', 'VT323-Regular.ttf');
    expect(existsSync(fontPath)).toBe(true);
  });

  it('should have @font-face in style.css', () => {
    const cssPath = join(process.cwd(), 'rogoweb', 'src', 'style.css');
    const cssContent = readFileSync(cssPath, 'utf8');
    expect(cssContent).toContain('@font-face');
    expect(cssContent).toContain("font-family: 'VT323'");
    expect(cssContent).toContain("url('/fonts/VT323-Regular.ttf')");
  });
});
