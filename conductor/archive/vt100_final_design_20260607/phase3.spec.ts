import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 3: Adaptive Controls', () => {
  it('should have name input in index.html', () => {
    const htmlPath = join(process.cwd(), 'rogoweb', 'index.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    expect(htmlContent).toContain('id="unix-name"');
  });

  it('should have mode selector in index.html', () => {
    const htmlPath = join(process.cwd(), 'rogoweb', 'index.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    expect(htmlContent).toContain('id="mode-manual"');
    expect(htmlContent).toContain('id="mode-auto"');
  });

  it('should have L1-L4 LEDs in index.html', () => {
    const htmlPath = join(process.cwd(), 'rogoweb', 'index.html');
    const htmlContent = readFileSync(htmlPath, 'utf8');
    expect(htmlContent).toContain('id="led-l1"');
    expect(htmlContent).toContain('id="led-l2"');
    expect(htmlContent).toContain('id="led-l3"');
    expect(htmlContent).toContain('id="led-l4"');
  });
});
