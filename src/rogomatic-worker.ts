/* Rogomatic Worker Entry Point (Classic Script) */
declare function importScripts(...args: string[]): void;

let ipc: any = null;

/**
 * Validate a persisted gene pool file. Returns false if the file is empty,
 * truncated, or otherwise malformed, so the caller can reset it instead of
 * letting the C learner index garbage genotypes (which hangs the game).
 *
 * Format written by writegenes()/writegene():
 *   header:   "<inittime> <trial> <lastid> <cross> <shift> <mut>|<score-stat>|<level-stat>|"
 *   genotype: "<id> <creation> <father> <mother>|<8 dna ints>|<score-stat>|<level-stat>|"
 */
function isValidGenePool(content: string): boolean {
  const MAXKNOB = 8; // number of DNA "knobs" (main.c)
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false; // need a header and at least one genotype

  const allNums = (s: string) => {
    const parts = s.trim().split(/\s+/);
    return parts.length > 0 && parts.every((p) => p !== '' && Number.isFinite(Number(p)));
  };

  // Header: 6 numbers, then two stat sections (split on '|')
  const header = lines[0].split('|');
  if (header.length < 3) return false;
  if (header[0].trim().split(/\s+/).length < 6 || !allNums(header[0])) return false;

  // Each genotype: id-info(4) | dna(>=MAXKNOB) | score | level
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|');
    if (parts.length < 4) return false;
    const idinfo = parts[0].trim().split(/\s+/);
    if (idinfo.length < 4 || !allNums(parts[0]) || Number(idinfo[0]) <= 0) return false;
    if (parts[1].trim().split(/\s+/).length < MAXKNOB || !allNums(parts[1])) return false;
  }
  return true;
}

self.onmessage = (e: MessageEvent) => {
  try {
    const { type, sab, userName, seed, isReset, size } = e.data;
    console.log('Rogomatic Worker: received message', type);

    if (type === 'init') {
      importScripts('/rogoweb/wasm/ipc-core.js');
      (self as any).isRogomatic = true;

      // Worker Polyfills for emcurses/termlib.js
      (self as any).window = self;
      (self as any).document = {
        createElement: () => ({ style: {}, appendChild: () => {} }),
        getElementById: () => null,
        all: null,
      };
      (self as any).navigator = { userAgent: 'WebWorker' };

      const SharedIPC = (self as any).SharedIPC;
      ipc = new SharedIPC(sab);
      (self as any).ipc = ipc;

      const term = new ((self as any).Terminal)();
      term.ipc = ipc;

      (self as any).Module = {
        noInitialRun: true,
        ENV: { 
          USER: userName, 
          LOGNAME: userName,
          ...(seed ? { SEED: seed } : {})
        },
        TerminalShim: (self as any).Terminal,
        onStatsUpdate: (stats: any) => {
          if (ipc) ipc.writeStats(stats, true);
        },
        wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const dest = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogueToRogomatic.read(dest, true); // BLOCKING READ
        },
        wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogomaticToRogue.write(src, true); // BLOCKING WRITE
        },
        onRuntimeInitialized: () => {
          console.log('Rogomatic Worker: WASM Runtime Initialized');

          const FS = (self as any).Module.FS;
          const mkdirSync = (path: string) => {
            try {
              FS.mkdir(path);
              console.log(`Rogomatic Worker: Created directory ${path}`);
            } catch (e: any) {
              if (e.errno !== 20) { // 20 is EEXIST
                 console.warn(`Rogomatic Worker: mkdir ${path} info:`, e.message);
              }
            }
          };

          mkdirSync('/var');
          mkdirSync('/var/games');
          mkdirSync('/var/games/rogomatic');

          console.log('Rogomatic Worker: Mounting IDBFS...');
          try {
            FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');
          } catch (e: any) {
            console.error('Rogomatic Worker: IDBFS mount failed:', e);
            self.postMessage({ type: 'fs_error', message: 'Failed to mount persistent storage.' });
          }

          console.log('Rogomatic Worker: Starting IDBFS sync...');
          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Rogomatic Worker: IDBFS syncfs(true) failed:', err);
              self.postMessage({ type: 'fs_error', message: 'Failed to synchronize persistent storage.' });
            } else {
              console.log('Rogomatic Worker: IDBFS synced');
            }

            // Clean up any stale lock files before starting
            try {
              const files = FS.readdir('/var/games/rogomatic');
              files.forEach((file: string) => {
                if (file.includes('Lock') || file.endsWith('.lck')) {
                  const fullPath = `/var/games/rogomatic/${file}`;
                  console.log(`Rogomatic Worker: Cleaning up stale lock file ${fullPath}`);
                  FS.unlink(fullPath);
                }
              });
            } catch (e) {
              console.warn('Rogomatic Worker: Error cleaning up lock files:', e);
            }

            // Create critical files if they don't exist to prevent C crashes
            const criticalFiles = [
              '/var/games/rogomatic/ltm544',
              '/var/games/rogomatic/rgmdelta5.4.4'
            ];
            criticalFiles.forEach(file => {
              try {
                if (!FS.analyzePath(file).exists) {
                  console.log(`Rogomatic Worker: Creating empty file ${file}`);
                  FS.writeFile(file, '');
                }
              } catch (e) {
                console.error(`Rogomatic Worker: Error checking/creating ${file}:`, e);
              }
            });

            // Validate the persisted gene pool before the C learner reads it.
            // A truncated/corrupt pool (e.g. from an interrupted sync) makes the
            // C code index garbage genotypes and hang at startup. If it fails
            // validation, delete it so a fresh pool is created instead.
            try {
              const poolPath = '/var/games/rogomatic/GenePool544';
              if (FS.analyzePath(poolPath).exists) {
                const poolData = FS.readFile(poolPath, { encoding: 'utf8' });
                if (!isValidGenePool(poolData)) {
                  console.warn('Rogomatic Worker: GenePool544 is corrupt/stale — resetting to a fresh pool');
                  FS.unlink(poolPath);
                  self.postMessage({
                    type: 'log',
                    source: 'rogomatic',
                    message: 'Corrupt gene pool detected — reset to a fresh pool.',
                    error: true,
                  });
                }
              }
            } catch (err) {
              console.warn('Rogomatic Worker: gene pool validation error:', err);
            }

            if (isReset) {
              console.log(`Rogomatic Worker: Resetting gene pool (size: ${size}, seed: ${seed})...`);
              const Module = (self as any).Module;
              if (typeof Module._emscripten_reset_gene_pool === 'function') {
                Module._emscripten_reset_gene_pool(size || 20, seed || 0);
                console.log('Rogomatic Worker: C gene pool reset complete');
              } else {
                console.error('Rogomatic Worker: _emscripten_reset_gene_pool not found!');
              }

              Module.syncFS().then(() => {
                console.log('Rogomatic Worker: syncFS complete, posting reset_complete');
                self.postMessage({ type: 'reset_complete' });
              });
              return;
            }

            const Module = (self as any).Module;
            if (typeof Module._setenv === 'function') {
              console.log('Rogomatic Worker: Setting environment variables via _setenv...');
              const setenvHelper = (key: string, value: string) => {
                const keyPtr = Module.stackAlloc(key.length * 4 + 1);
                Module.stringToUTF8(key, keyPtr, key.length * 4 + 1);
                const valPtr = Module.stackAlloc(value.length * 4 + 1);
                Module.stringToUTF8(value, valPtr, value.length * 4 + 1);
                Module._setenv(keyPtr, valPtr, 1);
              };
              setenvHelper('USER', userName);
              setenvHelper('LOGNAME', userName);
              if (seed) {
                setenvHelper('SEED', seed);
              }
            }

            console.log('Rogomatic Worker: Calling callMain...');
            try {
              (self as any).Module.callMain(['aa', '0', '0', userName]);
            } catch (e: any) {
              if (e && e.name !== 'ExitStatus' && e !== 'unwind') {
                console.error('Rogomatic Worker: Startup Error:', e);
              }
            }
          });
        },
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/rogoweb/wasm/' + path;
          }
          return path;
        },
        onExit: (status: number) => {
          console.log(`Rogomatic Worker: Exited with status ${status}`);
          self.postMessage({ type: 'exit', source: 'rogomatic', status });
        },
        print: (text: string) => {
          if (text.startsWith('Gene pool size') ||
              text.startsWith('Trials') ||
              text.startsWith('Mean score')) {
            self.postMessage({ type: 'log', source: 'rogomatic', message: text });
          } else {
            // Rogomatic stdout contains the VT100 stream
            self.postMessage({ type: 'stdout', source: 'rogomatic', message: text });
          }
        },
        printErr: (text: string) => {
          console.error('Rogomatic stderr:', text);
          self.postMessage({ type: 'log', source: 'rogomatic', message: text, error: true });
        },
        syncFS: () => {
          console.log('Rogomatic Worker: Syncing FS to IDBFS...');
          return new Promise<void>((resolve) => {
            const FS = (self as any).Module.FS;
            if (FS && FS.syncfs) {
              FS.syncfs(false, (err: any) => {
                if (err) console.error('Rogomatic Worker: syncfs(false) failed:', err);
                else console.log('Rogomatic Worker: syncfs(false) complete');
                resolve();
              });
            } else {
              resolve();
            }
          });
        }
      };

      // Ensure it's available globally for EM_ASM
      (self as any).syncFS = (self as any).Module.syncFS;

      importScripts('/rogoweb/wasm/rogomatic.js');
    }
  } catch (err) {
    console.error('Rogomatic Worker: Fatal initialization error:', err);
  }
};
