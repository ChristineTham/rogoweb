import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Phase 5: Functional Wiring', () => {
  it('should have keyboard input bridge in main.ts', () => {
    const mainPath = join(process.cwd(), 'rogoweb', 'src', 'main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    expect(mainContent).toContain('xterm.onData');
    expect(mainContent).toContain('shim.pushInput');
  });

  it('should have Emscripten lifecycle hooks in main.ts', () => {
    const mainPath = join(process.cwd(), 'rogoweb', 'src', 'main.ts');
    const mainContent = readFileSync(mainPath, 'utf8');
    expect(mainContent).toContain('onExit:');
    expect(mainContent).toContain('Module.ccall');
    expect(mainContent).toContain('async: true');
  });
});
