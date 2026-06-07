import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 4: Scaling Engine', () => {
  it('should have scaleTerminal function in main.ts', () => {
    const mainPath = join(process.cwd(), 'rogoweb', 'src', 'main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    expect(mainContent).toContain('const scaleTerminal =');
    expect(mainContent).toContain('terminal-viewport');
  });

  it('should implement natural scaling logic without forced spacing', () => {
    const mainPath = join(process.cwd(), 'rogoweb', 'src', 'main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    
    // Check for height-based sizing with bezel margin subtraction
    expect(mainContent).toContain('fontSize = (targetH - 4) / 24');
    
    // Check that we rely on natural character spacing instead of forcing it
    expect(mainContent).toContain('letterSpacing = 0');
  });
});
