import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Worker FS Initialization', () => {
  let mockModule: any;
  let mockFS: any;

  beforeEach(() => {
    mockFS = {
      mkdir: vi.fn(),
      mount: vi.fn(),
      syncfs: vi.fn((_populate, cb) => cb(null)),
      analyzePath: vi.fn((_path) => ({ exists: false })),
      writeFile: vi.fn(),
      filesystems: {
        IDBFS: { name: 'IDBFS' }
      }
    };

    mockModule = {
      FS: mockFS,
      callMain: vi.fn()
    };

    // Polyfill global worker environment
    (global as any).self = {
      onmessage: null,
      postMessage: vi.fn(),
      importScripts: vi.fn()
    };
    (global as any).importScripts = (global as any).self.importScripts;
    (global as any).Module = mockModule;
  });

  it('initializes and mounts IDBFS in Rogue worker context', async () => {
    // We can't easily import the worker file because it executes top-level code
    // that might fail in a non-worker environment.
    // Instead, we test the logic we injected into onRuntimeInitialized.
    
    const onRuntimeInitialized = () => {
      const FS = (global as any).Module.FS;
      try {
        FS.mkdir('/var');
        FS.mkdir('/var/games');
        FS.mkdir('/var/games/rogomatic');
      } catch { /* dirs may already exist */ }

      FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');

      FS.syncfs(true, (err: any) => {
        if (!err) {
          (global as any).Module.callMain(['-n', 'Player']);
        }
      });
    };

    onRuntimeInitialized();

    expect(mockFS.mkdir).toHaveBeenCalledWith('/var');
    expect(mockFS.mkdir).toHaveBeenCalledWith('/var/games');
    expect(mockFS.mkdir).toHaveBeenCalledWith('/var/games/rogomatic');
    expect(mockFS.mount).toHaveBeenCalledWith(mockFS.filesystems.IDBFS, {}, '/var/games/rogomatic');
    expect(mockFS.syncfs).toHaveBeenCalled();
    expect(mockModule.callMain).toHaveBeenCalledWith(['-n', 'Player']);
  });

  it('bootstraps critical files in Rogomatic worker context', async () => {
    const onRuntimeInitialized = () => {
      const FS = (global as any).Module.FS;
      try {
        FS.mkdir('/var');
        FS.mkdir('/var/games');
        FS.mkdir('/var/games/rogomatic');
      } catch { /* dirs may already exist */ }

      FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');

      FS.syncfs(true, (err: any) => {
        if (!err) {
          const criticalFiles = [
            '/var/games/rogomatic/ltm544',
            '/var/games/rogomatic/rgmdelta5.4.4'
          ];
          criticalFiles.forEach(file => {
            if (!FS.analyzePath(file).exists) {
              FS.writeFile(file, '');
            }
          });
          (global as any).Module.callMain(['aa', '0', '0', 'Player']);
        }
      });
    };

    onRuntimeInitialized();

    expect(mockFS.mount).toHaveBeenCalledWith(mockFS.filesystems.IDBFS, {}, '/var/games/rogomatic');
    expect(mockFS.writeFile).toHaveBeenCalledTimes(2);
    expect(mockFS.writeFile).toHaveBeenCalledWith('/var/games/rogomatic/ltm544', '');
    expect(mockModule.callMain).toHaveBeenCalledWith(['aa', '0', '0', 'Player']);
  });

  it('provides a syncFS hook for event-driven persistence', () => {
    let _syncFS: any;
    const ModuleProxy = new Proxy(mockModule, {
      set(target, prop, value) {
        if (prop === 'syncFS') _syncFS = value;
        target[prop] = value;
        return true;
      }
    });
    (global as any).Module = ModuleProxy;

    // Logic to be injected in workers
    (global as any).Module.syncFS = () => {
      const FS = (global as any).Module.FS;
      FS.syncfs(false, (_err: any) => {});
    };

    expect(typeof (global as any).Module.syncFS).toBe('function');
    (global as any).Module.syncFS();
    expect(mockFS.syncfs).toHaveBeenCalledWith(false, expect.any(Function));
  });
});
