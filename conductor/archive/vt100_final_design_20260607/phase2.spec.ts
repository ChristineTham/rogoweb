import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 2: Grid & Alignment', () => {
  it('should have the 5/3 mathematical anchor in style.css', () => {
    const cssPath = join(process.cwd(), 'rogoweb', 'src', 'style.css');
    const cssContent = readFileSync(cssPath, 'utf8');

    // Check for 5/3 aspect ratio
    expect(cssContent).toContain('--aspect: 1.666667');
  });

  it('should have flush alignment media queries', () => {
    const cssPath = join(process.cwd(), 'rogoweb', 'src', 'style.css');
    const cssContent = readFileSync(cssPath, 'utf8');

    expect(cssContent).toContain('min-aspect-ratio: 5/3');
    expect(cssContent).toContain('max-aspect-ratio: 5/3');
  });
});
