import { existsSync } from 'fs';
import { join } from 'path';

describe('Project Initialization', () => {
  it('should have a package.json file', () => {
    expect(existsSync(join(process.cwd(), 'rogoweb', 'package.json'))).toBe(true);
  });
});
